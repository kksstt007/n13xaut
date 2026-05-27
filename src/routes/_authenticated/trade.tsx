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
  const [sheet, setSheet] = React.useState<null | "buy" | "sell">(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () =>
      (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
    enabled: !!user,
  });

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
      setSheet(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

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

      {/* Price */}
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
          {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
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
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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

      {/* Buy / Sell only */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setSheet("buy")}
          className="relative overflow-hidden py-4 rounded-2xl font-bold text-base tracking-wide"
          style={{
            background: "linear-gradient(145deg, oklch(0.68 0.15 156), oklch(0.58 0.14 150))",
            boxShadow: "0 14px 36px -14px oklch(0.60 0.15 156 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
            color: "oklch(0.10 0.01 260)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowUp className="size-5" strokeWidth={2.5} />
            <span>BUY</span>
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setSheet("sell")}
          className="relative overflow-hidden py-4 rounded-2xl font-bold text-base tracking-wide"
          style={{
            background: "linear-gradient(145deg, oklch(0.66 0.18 22), oklch(0.56 0.17 18))",
            boxShadow: "0 14px 36px -14px oklch(0.60 0.18 22 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
            color: "oklch(0.98 0.005 250)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowDown className="size-5" strokeWidth={2.5} />
            <span>SELL</span>
          </div>
        </motion.button>
      </div>

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
          <span className="text-[11px] text-muted-foreground">Settling automatically</span>
        </motion.div>
      )}

      {/* Bottom Sheet */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !openMut.isPending && setSheet(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border/50 bg-surface-elevated p-5 pb-7 shadow-2xl"
              style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border/60" />

              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {sheet === "buy" ? "Open Long" : "Open Short"}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-lg font-bold ${
                        sheet === "buy" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {sheet === "buy" ? "BUY" : "SELL"}
                    </span>
                    <span className="text-sm text-muted-foreground num">@ ${fmtUSD(price)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</div>
                  <div className="text-sm font-semibold num">${fmtUSD(balance)}</div>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Amount
                </div>
                <div className="flex gap-2">
                  {AMOUNT_PRESETS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold num transition-all active:scale-95 ${
                        amount === v
                          ? "bg-gold/15 text-gold border border-gold/40"
                          : "bg-surface border border-border/40 text-foreground"
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(Math.min(amount * 2, 100000))}
                    className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-surface border border-border/40"
                  >
                    ×2
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
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
                          : "bg-surface border border-border/40 text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout */}
              <div className="flex items-center justify-between px-1 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Activity className="size-3.5" />
                  <span>Estimated payout</span>
                </div>
                <span className="text-sm font-bold text-gold num">
                  +${fmtUSD(amount * 0.85)}
                </span>
              </div>

              {/* Confirm */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => openMut.mutate(sheet)}
                disabled={openMut.isPending || !canTrade}
                className="w-full py-4 rounded-2xl font-bold text-base tracking-wide disabled:opacity-45 disabled:cursor-not-allowed"
                style={
                  sheet === "buy"
                    ? {
                        background: "linear-gradient(145deg, oklch(0.68 0.15 156), oklch(0.58 0.14 150))",
                        boxShadow: "0 14px 36px -14px oklch(0.60 0.15 156 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
                        color: "oklch(0.10 0.01 260)",
                      }
                    : {
                        background: "linear-gradient(145deg, oklch(0.66 0.18 22), oklch(0.56 0.17 18))",
                        boxShadow: "0 14px 36px -14px oklch(0.60 0.18 22 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
                        color: "oklch(0.98 0.005 250)",
                      }
                }
              >
                {openMut.isPending
                  ? "Opening..."
                  : `Confirm ${sheet === "buy" ? "BUY" : "SELL"} • $${fmtUSD(amount)}`}
              </motion.button>

              {!canTrade && (
                <p className="text-[11px] text-destructive text-center mt-3">
                  Insufficient balance. Fund your wallet to trade.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// silence unused import warning if TrendingUp removed later
void TrendingUp;
