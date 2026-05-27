import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
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

const TIMEFRAMES = [
  { id: "1D", label: "1 Day" },
  { id: "1W", label: "1 Week" },
  { id: "1M", label: "1 Month" },
  { id: "6M", label: "6 Months" },
  { id: "1Y", label: "1 Year" },
  { id: "ALL", label: "All" },
];

const DURATIONS = [
  { s: 30, label: "30s" }, { s: 60, label: "1m" }, { s: 300, label: "5m" }, { s: 900, label: "15m" },
];

function TradePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: chart, price, changePct, change } = usePriceFeed(80);
  const up = changePct >= 0;
  const qc = useQueryClient();

  const [tf, setTf] = React.useState("6M");
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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.history.back()}
            className="size-10 rounded-full bg-surface-elevated/80 border border-border/60 grid place-items-center hover:bg-surface-elevated transition"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <div className="text-base font-semibold tracking-tight">Tether Gold</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">XAU₮ / USDT</div>
          </div>
          <button
            className="size-10 rounded-full bg-surface-elevated/80 border border-border/60 grid place-items-center hover:bg-surface-elevated transition"
            aria-label="More"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>

        {/* Timeframe pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin -mx-1 px-1">
          {TIMEFRAMES.map((t) => {
            const active = tf === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTf(t.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition ${
                  active
                    ? "bg-gradient-gold text-primary-foreground shadow-gold-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Price */}
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[15px] font-medium text-muted-foreground">XAU₮ =</span>
            <motion.span
              key={Math.floor(price * 100)}
              initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
              className="num text-[34px] sm:text-4xl font-bold tracking-tight"
            >
              ${fmtUSD(price)}
            </motion.span>
          </div>
          <div className={`mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium ${up ? "text-success" : "text-destructive"}`}>
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <span className="num">{up ? "+" : ""}${fmtUSD(Math.abs(change))}</span>
            <span className="num">({fmtPct(changePct)})</span>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-surface/70 to-background p-3 sm:p-4 shadow-elevated">
          <div className="h-[300px] sm:h-[380px] -mx-1">
            <PriceChart data={chart} up={up} />
          </div>
          <div className="mt-1 grid grid-cols-7 text-[10.5px] text-muted-foreground">
            {months.map((m, i) => (
              <span key={m} className={`text-center ${i === 2 || i === 4 ? "text-foreground/80 font-medium" : ""}`}>{m}</span>
            ))}
          </div>
        </div>

        {/* Info pill card */}
        <div className="rounded-2xl border border-border/50 bg-surface/70 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Payout</div>
              <div className="num text-base font-semibold mt-0.5 text-gold">+85%</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Duration</div>
              <div className="text-base font-semibold mt-0.5">
                {DURATIONS.find((d) => d.s === duration)?.label}
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden border border-border/40">
            <div className="h-full w-[68%] bg-gradient-gold" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        {/* Big Buy/Sell pills */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => openMut.mutate("buy")}
            disabled={openMut.isPending || amount > balance}
            className="py-4 rounded-full bg-success text-success-foreground text-base font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 shadow-[0_10px_28px_-12px_oklch(0.70_0.15_156_/_0.6)]"
          >
            Buy
          </button>
          <button
            onClick={() => openMut.mutate("sell")}
            disabled={openMut.isPending || amount > balance}
            className="py-4 rounded-full bg-destructive text-destructive-foreground text-base font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 shadow-[0_10px_28px_-12px_oklch(0.64_0.20_22_/_0.6)]"
          >
            Sell
          </button>
        </div>
        {amount > balance && (
          <p className="text-xs text-destructive text-center">Insufficient balance — fund your wallet to trade.</p>
        )}

        {/* Open positions */}
        <div className="rounded-2xl border border-border/50 bg-surface/60 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Open positions</h3>
            <span className="text-[11px] text-muted-foreground">{positions?.length ?? 0} active</span>
          </div>
          {positions?.length ? (
            <div className="space-y-2">
              <AnimatePresence>
                {positions.map((p: any) => <PositionRow key={p.id} pos={p} />)}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No open positions yet.</p>
          )}
        </div>
      </div>

      {/* Ticket — desktop sidebar */}
      <div className="rounded-2xl border border-border/50 bg-surface/70 p-5 h-fit lg:sticky lg:top-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Place trade</h3>
          <span className="text-xs text-muted-foreground num">Bal: ${fmtUSD(balance)}</span>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Amount (USDT)</label>
          <input
            type="number" min={1} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 num text-lg outline-none focus:border-gold"
          />
          <div className="mt-2 flex gap-1.5">
            {[10, 25, 50, 100, 500].map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                className="flex-1 text-xs py-1.5 rounded-md bg-surface-elevated hover:bg-secondary num">{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground">Duration</label>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {DURATIONS.map((d) => (
              <button key={d.s} onClick={() => setDuration(d.s)}
                className={`py-2 rounded-md text-sm transition ${duration === d.s ? "bg-gradient-gold text-primary-foreground shadow-gold-soft" : "bg-surface-elevated hover:bg-secondary"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>Payout</span><span className="text-gold num">+85%</span></div>
          <div className="flex justify-between"><span>Potential win</span><span className="text-success num">+${fmtUSD(amount * 0.85)}</span></div>
          <div className="flex justify-between"><span>Risk</span><span className="text-destructive num">−${fmtUSD(amount)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => openMut.mutate("buy")} disabled={openMut.isPending || amount > balance}
            className="py-3 rounded-full bg-success text-success-foreground font-semibold hover:opacity-90 disabled:opacity-50">
            BUY ▲
          </button>
          <button onClick={() => openMut.mutate("sell")} disabled={openMut.isPending || amount > balance}
            className="py-3 rounded-full bg-destructive text-destructive-foreground font-semibold hover:opacity-90 disabled:opacity-50">
            SELL ▼
          </button>
        </div>
      </div>
    </div>
  );
}

function PositionRow({ pos }: { pos: any }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const remaining = Math.max(0, Math.floor((new Date(pos.closes_at).getTime() - now) / 1000));
  const buy = pos.direction === "buy";
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/60 border border-border/40"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`size-8 rounded-full grid place-items-center ${buy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
          {buy ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{pos.direction.toUpperCase()} · ${fmtUSD(Number(pos.amount))}</div>
          <div className="text-[11px] text-muted-foreground num">Entry ${fmtUSD(Number(pos.open_price))} · +{pos.payout_pct}%</div>
        </div>
      </div>
      <div className="text-right">
        <div className="num text-sm font-semibold">{remaining}s</div>
        <div className="text-[10px] text-muted-foreground">closes in</div>
      </div>
    </motion.div>
  );
}
