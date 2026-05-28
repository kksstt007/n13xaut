import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const openTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    direction: z.enum(["buy", "sell"]),
    amount: z.number().min(1).max(100000),
    durationSec: z.number().int().min(15).max(3600),
    openPrice: z.number().positive(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: wallet } = await supabaseAdmin.from("wallets").select("usdt_balance").eq("user_id", userId).single();
    if (!wallet || Number(wallet.usdt_balance) < data.amount) throw new Error("Insufficient balance");

    // Payout is derived from the chosen duration so the UI's "Ror" matches settlement exactly.
    const DURATION_PAYOUT: Record<number, number> = { 60: 15, 120: 20, 180: 25, 300: 30 };
    const { data: ov } = await supabaseAdmin.from("trade_overrides").select("win_payout_pct").eq("user_id", userId).maybeSingle();
    const overridePct = ov?.win_payout_pct == null ? null : Number(ov.win_payout_pct);
    // Duration-based payout is the default. Only honor an explicit per-user override that is > 0 and not the legacy 85 default.
    const durationPayout = DURATION_PAYOUT[data.durationSec] ?? 15;
    const payout = overridePct != null && overridePct > 0 && overridePct !== 85 ? overridePct : durationPayout;


    await supabaseAdmin.from("wallets").update({
      usdt_balance: Number(wallet.usdt_balance) - data.amount,
      locked: data.amount,
    }).eq("user_id", userId);

    const closesAt = new Date(Date.now() + data.durationSec * 1000).toISOString();
    const { data: trade, error } = await supabaseAdmin.from("trades").insert({
      user_id: userId, direction: data.direction, amount: data.amount,
      duration_sec: data.durationSec, open_price: data.openPrice, payout_pct: payout,
      closes_at: closesAt,
    }).select().single();
    if (error) throw new Error(error.message);
    return { trade };
  });

export const settleTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tradeId: z.string().uuid(), closePrice: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: trade } = await supabaseAdmin.from("trades").select("*").eq("id", data.tradeId).eq("user_id", context.userId).single();
    if (!trade || trade.status !== "open") throw new Error("Trade not open");

    const { data: ov } = await supabaseAdmin.from("trade_overrides").select("*").eq("user_id", context.userId).maybeSingle();
    let result: "win" | "loss";
    if (ov?.next_result === "win" || ov?.next_result === "loss") {
      result = ov.next_result as "win" | "loss";
      await supabaseAdmin.from("trade_overrides").update({ next_result: null }).eq("user_id", context.userId);
    } else if (ov?.default_result === "win") result = "win";
    else if (ov?.default_result === "loss") result = "loss";
    else {
      const movedUp = data.closePrice > Number(trade.open_price);
      result = (trade.direction === "buy" ? movedUp : !movedUp) ? "win" : "loss";
    }
    const DURATION_PAYOUT: Record<number, number> = { 60: 15, 120: 20, 180: 25, 300: 30 };
    const effectivePayout = Number(trade.payout_pct) > 0 ? Number(trade.payout_pct) : (DURATION_PAYOUT[Number(trade.duration_sec)] ?? 15);
    const pnl = result === "win" ? Number(trade.amount) * effectivePayout / 100 : -Number(trade.amount);
    const credit = result === "win" ? Number(trade.amount) + pnl : 0;

    await supabaseAdmin.from("trades").update({
      status: "settled", result, pnl, payout_pct: effectivePayout, close_price: data.closePrice, settled_at: new Date().toISOString(),
    }).eq("id", trade.id);

    const { data: w } = await supabaseAdmin.from("wallets").select("usdt_balance, locked").eq("user_id", context.userId).single();
    await supabaseAdmin.from("wallets").update({
      usdt_balance: Number(w!.usdt_balance) + credit,
      locked: Math.max(0, Number(w!.locked) - Number(trade.amount)),
    }).eq("user_id", context.userId);

    return { result, pnl };
  });
