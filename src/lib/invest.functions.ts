import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Plan catalog — mirrors UI in src/routes/_authenticated/invest.tsx
type PlanDef = {
  level: number;
  name: string;
  min: number;
  max: number | null;
  dailyMin: number; // percent
  dailyMax: number;
  termDays: number;
};
const PLANS: PlanDef[] = [
  { level: 1, name: "Starter", min: 50, max: 200, dailyMin: 1.0, dailyMax: 1.2, termDays: 30 },
  { level: 2, name: "Standard", min: 200, max: 1000, dailyMin: 1.2, dailyMax: 1.5, termDays: 30 },
  { level: 3, name: "Advanced", min: 1000, max: 5000, dailyMin: 1.5, dailyMax: 1.8, termDays: 45 },
  { level: 4, name: "VIP", min: 5000, max: 20000, dailyMin: 1.8, dailyMax: 2.2, termDays: 45 },
  { level: 5, name: "Institutional", min: 20000, max: null, dailyMin: 2.2, dailyMax: 2.8, termDays: 60 },
];

function pickPlan(level: number): PlanDef {
  const p = PLANS.find((x) => x.level === level);
  if (!p) throw new Error("Invalid plan level");
  return p;
}

// Daily rate locked at investment time. We linearly interpolate within range
// based on the amount: bigger commitment in a tier earns the higher edge.
function computeDailyRate(plan: PlanDef, amount: number): number {
  const max = plan.max ?? Math.max(plan.min * 4, amount);
  const t = Math.min(1, Math.max(0, (amount - plan.min) / Math.max(1, max - plan.min)));
  const pct = plan.dailyMin + (plan.dailyMax - plan.dailyMin) * t;
  return Number((pct / 100).toFixed(4)); // store as fraction (e.g. 0.0150)
}

export const createInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ level: z.number().int().min(1).max(5), amount: z.number().positive() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const plan = pickPlan(data.level);
    const amount = Math.round(data.amount * 100) / 100;
    if (amount < plan.min) throw new Error(`Minimum for ${plan.name} is $${plan.min}`);
    if (plan.max != null && amount > plan.max)
      throw new Error(`Maximum for ${plan.name} is $${plan.max}`);

    // Check wallet
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("usdt_balance, locked")
      .eq("user_id", userId)
      .single();
    if (wErr || !wallet) throw new Error("Wallet not found");
    if (Number(wallet.usdt_balance) < amount) throw new Error("Insufficient balance");

    const dailyRate = computeDailyRate(plan, amount);
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + plan.termDays * 86400_000);

    // Deduct first (RLS allows admin; use service role)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newBal = Number(wallet.usdt_balance) - amount;
    const { error: uErr } = await supabaseAdmin
      .from("wallets")
      .update({ usdt_balance: newBal })
      .eq("user_id", userId);
    if (uErr) throw new Error("Failed to debit wallet");

    const { data: inv, error: iErr } = await supabaseAdmin
      .from("investments")
      .insert({
        user_id: userId,
        level: plan.level,
        plan_name: plan.name,
        amount,
        daily_rate: dailyRate,
        term_days: plan.termDays,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        last_payout_at: startAt.toISOString(),
      })
      .select("*")
      .single();
    if (iErr) {
      // rollback debit
      await supabaseAdmin.from("wallets").update({ usdt_balance: wallet.usdt_balance }).eq("user_id", userId);
      throw new Error("Failed to create investment");
    }
    return { investment: inv, balance: newBal };
  });

export const listInvestments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("investments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Claim accrued daily yield. Pays out from last_payout_at up to min(now, end_at).
// On/after end_at: also returns principal and marks completed.
export const claimYield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inv, error } = await supabaseAdmin
      .from("investments")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error || !inv) throw new Error("Investment not found");
    if (inv.status !== "active") throw new Error("Investment is not active");

    const DAY_MS = 86_400_000;
    const now = new Date();
    const end = new Date(inv.end_at);
    const last = new Date(inv.last_payout_at);
    const cap = now > end ? end : now;

    // Only whole days accrue. One claim = one (or more) full 24h cycles.
    const elapsedMs = Math.max(0, cap.getTime() - last.getTime());
    const fullDays = Math.floor(elapsedMs / DAY_MS);
    const matured = now >= end;

    if (fullDays <= 0 && !matured) {
      const nextAt = new Date(last.getTime() + DAY_MS);
      const hoursLeft = Math.ceil((nextAt.getTime() - now.getTime()) / 3_600_000);
      throw new Error(
        `Next payout available in ~${hoursLeft}h (yields unlock once every 24h).`,
      );
    }

    const dailyAmt =
      Math.floor(Number(inv.amount) * Number(inv.daily_rate) * 100) / 100;
    const yieldAmt = Math.floor(dailyAmt * fullDays * 100) / 100;

    const principal = matured && !inv.principal_returned ? Number(inv.amount) : 0;
    const credit = yieldAmt + principal;

    if (credit <= 0) throw new Error("Nothing to claim yet");

    // Advance last_payout_at by exact whole-day increments so the next
    // 24h window stays aligned to the original start time.
    const newLast = new Date(last.getTime() + fullDays * DAY_MS);
    const payoutMark = matured ? end : newLast;

    // Credit wallet
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("usdt_balance")
      .eq("user_id", userId)
      .single();
    const newBal = Number(wallet?.usdt_balance ?? 0) + credit;
    await supabaseAdmin.from("wallets").update({ usdt_balance: newBal }).eq("user_id", userId);

    const patch: {
      last_payout_at: string;
      total_paid: number;
      principal_returned?: boolean;
      status?: string;
    } = {
      last_payout_at: payoutMark.toISOString(),
      total_paid: Number(inv.total_paid) + yieldAmt,
    };
    if (matured) {
      patch.principal_returned = true;
      patch.status = "completed";
    }
    await supabaseAdmin.from("investments").update(patch).eq("id", inv.id);


    return { credited: credit, yield: yieldAmt, principal, balance: newBal, matured };
  });
