import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Wallet,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
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
  { id: "1D", label: "1D" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "ALL", label: "All" },
];

const AMOUNT_PRESETS = [10, 50, 100, 500];
const DURATIONS = [
  { s: 30, label: "30s" },
  { s: 60, label: "1m" },
  { s: 300, label: "5m" },
  { s: 900, label: "15m" },
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
    queryFn: async () =>
      (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
    enabled: !!user,
  });

  /* Keep positions query running so settlement logic works */
  const { data: positions } = useQuery({
    queryKey: ["open-trades", user?.id],
    queryFn: async () =>
      (await supabase.from("trades").select("*").eq("user_id", user!.id).eq("status", "open").order("closes_at")).data ?? [],
    enabled: !!user,
    refetchInterval: 2000,
  });

  const openServer = useServerFn(openTrade);
  const settleServer = useServerFn(settleTrade);

  const openMut = useMutation({
    mutationFn: (dir: "buy" | "sell") =>
      openServer({ data: { direction: dir, amount, durationSec: duration, openPrice: price } }),
    onSuccess: () => {
      toast.success("Trade opened");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* Background settlement — no UI needed */
  React.useEffect(() => {
    if (!positions?.length) return;
    const t = setInterval(() => {
      const now = Date.now();
      positions.forEach((p: any) => {
        if (new Date(p.closes_at).getTime() <= now) {
          settleServer({ data: { tradeId: p.id, closePrice: getCurrentPrice() } })
            .then((r: any) => {
              toast[r.result === "win" ? "success" : "error"](
                `Trade ${r.result.toUpperCase()} ${r.pnl >= 0 ? "+" : ""}$${fmtUSD(Number(r.pnl))}`
              );
              qc.invalidateQueries();
            })
            .catch(() => {});
        }
      });
    }, 1000);
    return () => clearInterval(t);
  }, [positions, settleServer, qc]);

  const balance = Number(wallet?.usdt_balance ?? 0);
  const canTrade = balance >= amount && amount >= 1;

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.history.back()}
          className="size-10 rounded-2xl bg-surface-elevated border border-border/50 grid place-items-center hover:bg-surface transition active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="size-5 text-muted-foreground" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold tracking-tight">Tether Gold</div>
          <div className="text-[10px] text-muted-foreground tracking-wide">XAU₮ / USDT</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-elevated border border-border/50">
          <Wallet className="size-3.5 text-gold" />
          <span className="text-xs font-medium num">${fmtUSD(balance)}</span>
        </div>
      </div>

      {/* Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-medium">XAU₮ =</span>
          <motion.span
            key={Math.floor(price * 100)}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="num text-[40px] sm:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ${fmtUSD(price)}
          </motion.span>
        </div>
        <div
          className={`mt-1 inline-flex items-center gap-1.5 text-sm font-medium ${
            up ? "text-success" : "text-destructive"
          }`}
        >
          {up ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )}
          <span className="num">{up ? "+" : "-"}${fmtUSD(Math.abs(change))}</span>
          <span className="num">({fmtPct(changePct)})</span>
        </div>
      </motion.div>

      {/* Timeframe pills */}
      <div className="flex items-center justify-center gap-1">
        {TIMEFRAMES.map((t) => {
          const active = tf === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTf(t.id)}
              className={`relative px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tf-pill"
                  className="absolute inset-0 bg-gradient-gold rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-3xl border border-border/40 bg-surface/60 p-3 sm:p-4 shadow-elevated"
      >
        <div className="h-[260px] sm:h-[320px]">
          <PriceChart data={chart} up={up} />
        </div>
      </motion.div>

      {/* Trade Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="space-y-4"
      >
        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount
            </span>
            <span className="text-[11px] text-muted-foreground">
              Bal: <span className="num text-foreground">${fmtUSD(balance)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            {AMOUNT_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold num transition-all active:scale-95 ${
                  amount === v
                    ? "bg-gold/15 text-gold border border-gold/40"
                    : "bg-surface-elevated border border-border/40 text-foreground hover:bg-secondary"
                }`}
              >
                ${v}
              </button>
            ))}
            <button
              onClick={() => {
                const next = amount * 2;
                setAmount(Math.min(next, 100000));
              }}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-surface-elevated border border-border/40 text-foreground hover:bg-secondary transition-all active:scale-95"
            >
              ×2
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Duration
            </span>
          </div>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.s}
                onClick={() => setDuration(d.s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  duration === d.s
                    ? "bg-gradient-gold text-primary-foreground shadow-gold-soft"
                    : "bg-surface-elevated border border-border/40 text-foreground hover:bg-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payout info */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            <span>Payout</span>
          </div>
          <span className="text-sm font-bold text-gold num">+85%</span>
        </div>

        {/* Buy / Sell Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => openMut.mutate("buy")}
            disabled={openMut.isPending || !canTrade}
            className="relative group overflow-hidden py-4 rounded-2xl font-bold text-base tracking-wide transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(145deg, oklch(0.68 0.15 156), oklch(0.58 0.14 150))",
              boxShadow: "0 14px 36px -14px oklch(0.60 0.15 156 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
              color: "oklch(0.10 0.01 260)",
            }}
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition" />
            <div className="relative flex items-center justify-center gap-2">
              <ArrowUp className="size-5" strokeWidth={2.5} />
              <span>BUY</span>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => openMut.mutate("sell")}
            disabled={openMut.isPending || !canTrade}
            className="relative group overflow-hidden py-4 rounded-2xl font-bold text-base tracking-wide transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(145deg, oklch(0.66 0.18 22), oklch(0.56 0.17 18))",
              boxShadow: "0 14px 36px -14px oklch(0.60 0.18 22 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
              color: "oklch(0.98 0.005 250)",
            }}
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition" />
            <div className="relative flex items-center justify-center gap-2">
              <ArrowDown className="size-5" strokeWidth={2.5} />
              <span>SELL</span>
            </div>
          </motion.button>
        </div>

        {!canTrade && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-destructive text-center"
          >
            Insufficient balance. Fund your wallet to trade.
          </motion.p>
        )}
      </motion.div>

      {/* Active positions mini bar */}
      {!!positions?.length && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-2xl bg-surface/50 border border-border/40"
        >
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium">
              {positions.length} active position{positions.length > 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Settling automatically
          </span>
        </motion.div>
      )}
    </div>
  );
}
