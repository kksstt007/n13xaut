import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Server-side price oracle. Fetches XAU/USD spot from a public API.
// Never trust client-supplied prices for trade open/settle — they can be
// manipulated to guarantee wins.
async function fetchServerPrice(): Promise<number> {
  const endpoints = [
    {
      url: "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd",
      pick: (j: any) => Number(j?.["tether-gold"]?.usd),
    },
    {
      url: "https://api.gold-api.com/price/XAU",
      pick: (j: any) => Number(j?.price),
    },
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url, { headers: { accept: "application/json" } });
      if (!r.ok) continue;
      const j = await r.json();
      const p = ep.pick(j);
      if (Number.isFinite(p) && p > 0) return p;
    } catch {
      // try next
    }
  }
  throw new Error("Price feed unavailable, please retry");
}

export const openTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    direction: z.enum(["buy", "sell"]),
    amount: z.number().min(1).max(100000),
    durationSec: z.number().int().min(15).max(3600),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Payout is derived from the chosen duration so the UI's "Ror" matches settlement exactly.
    const DURATION_PAYOUT: Record<number, number> = { 60: 15, 120: 20, 180: 25, 300: 30 };
    const { data: ov } = await supabaseAdmin.from("trade_overrides").select("win_payout_pct").eq("user_id", userId).maybeSingle();
    const overridePct = ov?.win_payout_pct == null ? null : Number(ov.win_payout_pct);
    const durationPayout = DURATION_PAYOUT[data.durationSec] ?? 15;
    const payout = overridePct != null && overridePct > 0 && overridePct !== 85 ? overridePct : durationPayout;

    // Server-side price — never trust the client.
    const openPrice = await fetchServerPrice();

    // Atomic debit — rejects if balance insufficient; prevents concurrent overspend.
    const { error: debitErr } = await supabaseAdmin.rpc("debit_wallet", {
      _user_id: userId,
      _amount: data.amount,
      _lock_delta: data.amount,
    });
    if (debitErr) throw new Error(debitErr.message || "Insufficient balance");

    const closesAt = new Date(Date.now() + data.durationSec * 1000).toISOString();
    const { data: trade, error } = await supabaseAdmin.from("trades").insert({
      user_id: userId, direction: data.direction, amount: data.amount,
      duration_sec: data.durationSec, open_price: openPrice, payout_pct: payout,
      closes_at: closesAt,
    }).select().single();
    if (error) {
      // Rollback debit on insert failure
      await supabaseAdmin.rpc("credit_wallet", { _user_id: userId, _amount: data.amount, _lock_delta: -data.amount });
      throw new Error(error.message);
    }
    return { trade };
  });


export const settleTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tradeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: trade } = await supabaseAdmin.from("trades").select("*").eq("id", data.tradeId).eq("user_id", context.userId).single();
    if (!trade || trade.status !== "open") throw new Error("Trade not open");

    // Enforce expiry — settlement cannot happen before closes_at.
    if (new Date(trade.closes_at).getTime() > Date.now()) {
      throw new Error("Trade not yet expired");
    }

    // Server-side close price — never trust the client.
    const closePrice = await fetchServerPrice();

    const { data: ov } = await supabaseAdmin.from("trade_overrides").select("*").eq("user_id", context.userId).maybeSingle();
    let result: "win" | "loss";
    if (ov?.next_result === "win" || ov?.next_result === "loss") {
      result = ov.next_result as "win" | "loss";
      await supabaseAdmin.from("trade_overrides").update({ next_result: null }).eq("user_id", context.userId);
    } else if (ov?.default_result === "win") result = "win";
    else if (ov?.default_result === "loss") result = "loss";
    else {
      const movedUp = closePrice > Number(trade.open_price);
      result = (trade.direction === "buy" ? movedUp : !movedUp) ? "win" : "loss";
    }
    const DURATION_PAYOUT: Record<number, number> = { 60: 15, 120: 20, 180: 25, 300: 30 };
    const effectivePayout = Number(trade.payout_pct) > 0 ? Number(trade.payout_pct) : (DURATION_PAYOUT[Number(trade.duration_sec)] ?? 15);
    const pnl = result === "win" ? Number(trade.amount) * effectivePayout / 100 : -Number(trade.amount);
    const credit = result === "win" ? Number(trade.amount) + pnl : 0;

    await supabaseAdmin.from("trades").update({
      status: "settled", result, pnl, payout_pct: effectivePayout, close_price: closePrice, settled_at: new Date().toISOString(),
    }).eq("id", trade.id);

    // Atomic credit + release the locked amount.
    if (credit > 0) {
      await supabaseAdmin.rpc("credit_wallet", {
        _user_id: context.userId,
        _amount: credit,
        _lock_delta: -Number(trade.amount),
      });
    } else {
      await supabaseAdmin.rpc("credit_wallet", {
        _user_id: context.userId,
        _amount: 0,
        _lock_delta: -Number(trade.amount),
      });
    }

    return { result, pnl };
  });

