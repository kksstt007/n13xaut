import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePriceFeed, getCurrentPrice } from "@/lib/price-feed";
import { PriceChart } from "@/components/PriceChart";
import { fmtUSD, fmtPct } from "@/lib/format";
import { openTrade, settleTrade } from "@/lib/trade.functions";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({ meta: [{ title: "Trade XAU/USDT — XAUT.trade" }] }),
  component: TradePage,
});

const DURATIONS = [
  { s: 30, label: "30s" }, { s: 60, label: "1m" }, { s: 300, label: "5m" }, { s: 900, label: "15m" },
];

function TradePage() {
  const { user } = useAuth();
  const { data: chart, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;
  const qc = useQueryClient();

  const [amount, setAmount] = React.useState(50);
  const [duration, setDuration] = React.useState(60);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: positions } = useQuery({
    queryKey: ["open-trades", user?.id],
    queryFn: async () => (await supabase.from("trades").select("*").eq("user_id", user!.id).eq("status", "open").order("closes_at")).data ?? [],
    enabled: !!user, refetchInterval: 2000,
  });

  const open = useServerFn(openTrade);
  const settle = useServerFn(settleTrade);

  const openMut = useMutation({
    mutationFn: (dir: "buy" | "sell") => open({ data: { direction: dir, amount, durationSec: duration, openPrice: price } }),
    onSuccess: () => { toast.success("Trade opened"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-settle expired trades
  React.useEffect(() => {
    if (!positions?.length) return;
    const t = setInterval(() => {
      const now = Date.now();
      positions.forEach((p: any) => {
        if (new Date(p.closes_at).getTime() <= now) {
          settle({ data: { tradeId: p.id, closePrice: getCurrentPrice() } })
            .then((r: any) => {
              toast[r.result === "win" ? "success" : "error"](`Trade ${r.result.toUpperCase()} ${r.pnl >= 0 ? "+" : ""}$${fmtUSD(Number(r.pnl))}`);
              qc.invalidateQueries();
            })
            .catch(() => {});
        }
      });
    }, 1000);
    return () => clearInterval(t);
  }, [positions, settle, qc]);

  const balance = Number(wallet?.usdt_balance ?? 0);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <div className="glass rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs text-muted-foreground">XAU/USDT · Tether Gold</div>
              <motion.div key={Math.floor(price * 100)} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="num text-4xl font-bold mt-1">
                ${fmtUSD(price)}
              </motion.div>
            </div>
            <div className="text-right">
              <div className={`num text-lg font-semibold ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)}</div>
              <div className="text-xs text-muted-foreground">last 80s</div>
            </div>
          </div>
          <div className="h-[420px]"><PriceChart data={chart} up={up} /></div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-3">Open positions</h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border/50">
                <tr><th className="text-left py-2">Direction</th><th className="text-left">Amount</th><th className="text-left">Entry</th><th className="text-left">Payout</th><th className="text-left">Closes in</th></tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {positions?.length ? positions.map((p: any) => (
                    <CountdownRow key={p.id} pos={p} />
                  )) : (
                    <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No open positions</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket */}
      <div className="glass rounded-xl p-5 h-fit lg:sticky lg:top-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Place trade</h3>
          <span className="text-xs text-muted-foreground num">Bal: ${fmtUSD(balance)}</span>
        </div>

        <label className="text-xs text-muted-foreground">Amount (USDT)</label>
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 num text-lg outline-none focus:border-gold" />
        <div className="mt-2 flex gap-1.5">
          {[10, 25, 50, 100, 500].map((v) => (
            <button key={v} onClick={() => setAmount(v)}
              className="flex-1 text-xs py-1.5 rounded-md bg-surface-elevated hover:bg-secondary num">{v}</button>
          ))}
        </div>

        <label className="block mt-5 text-xs text-muted-foreground">Duration</label>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {DURATIONS.map((d) => (
            <button key={d.s} onClick={() => setDuration(d.s)}
              className={`py-2 rounded-md text-sm transition ${duration === d.s ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-surface-elevated hover:bg-secondary"}`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-5 p-3 rounded-lg bg-surface-elevated text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>Payout</span><span className="text-gold num">+85%</span></div>
          <div className="flex justify-between"><span>Potential win</span><span className="text-success num">+${fmtUSD(amount * 0.85)}</span></div>
          <div className="flex justify-between"><span>Risk</span><span className="text-destructive num">−${fmtUSD(amount)}</span></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => openMut.mutate("buy")} disabled={openMut.isPending || amount > balance}
            className="py-3 rounded-lg bg-success text-success-foreground font-semibold hover:opacity-90 disabled:opacity-50">
            BUY ▲
          </button>
          <button onClick={() => openMut.mutate("sell")} disabled={openMut.isPending || amount > balance}
            className="py-3 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:opacity-90 disabled:opacity-50">
            SELL ▼
          </button>
        </div>
        {amount > balance && <p className="mt-2 text-xs text-destructive">Insufficient balance — fund your wallet to trade.</p>}
      </div>
    </div>
  );
}

function CountdownRow({ pos }: { pos: any }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const remaining = Math.max(0, Math.floor((new Date(pos.closes_at).getTime() - now) / 1000));
  return (
    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/30">
      <td className="py-2.5"><span className={`px-2 py-0.5 rounded text-xs ${pos.direction === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{pos.direction.toUpperCase()}</span></td>
      <td className="num">${fmtUSD(Number(pos.amount))}</td>
      <td className="num">${fmtUSD(Number(pos.open_price))}</td>
      <td className="num text-gold">+{pos.payout_pct}%</td>
      <td className="num">{remaining}s</td>
    </motion.tr>
  );
}
