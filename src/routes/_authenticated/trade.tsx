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

const DURATIONS = [
  { s: 60, label: "60 s", ror: 15 },
  { s: 120, label: "120 s", ror: 20 },
  { s: 180, label: "180 s", ror: 25 },
  { s: 300, label: "300 s", ror: 30 },
];

type ActiveTrade = {
  id: string;
  direction: "buy" | "sell";
  amount: number;
  payoutPct: number;
  openPrice: number;
  openedAt: number;
  closesAt: number;
  durationSec: number;
};
type TradeResult = { result: "win" | "loss"; pnl: number; closePrice: number };

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
  const [active, setActive] = React.useState<ActiveTrade | null>(null);
  const [result, setResult] = React.useState<TradeResult | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const settlingRef = React.useRef(false);

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
    onSuccess: ({ trade }: any) => {
      setSheet(null);
      setResult(null);
      settlingRef.current = false;
      setActive({
        id: trade.id,
        direction: trade.direction,
        amount: Number(trade.amount),
        payoutPct: Number(trade.payout_pct),
        openPrice: Number(trade.open_price),
        openedAt: new Date(trade.opened_at).getTime(),
        closesAt: new Date(trade.closes_at).getTime(),
        durationSec: Number(trade.duration_sec),
      });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Tick clock for countdown / live elapsed
  React.useEffect(() => {
    if (!active && !positions?.length) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active, positions?.length]);

  // Settle the active trade exactly once when countdown hits 0
  React.useEffect(() => {
    if (!active || result || settlingRef.current) return;
    if (now < active.closesAt) return;
    settlingRef.current = true;
    settleServer({ data: { tradeId: active.id, closePrice: getCurrentPrice() } })
      .then((r: any) => {
        setResult({ result: r.result, pnl: Number(r.pnl), closePrice: getCurrentPrice() });
        qc.invalidateQueries();
      })
      .catch((e: any) => {
        toast.error(e?.message ?? "Settlement failed");
        settlingRef.current = false;
      });
  }, [active, result, now, settleServer, qc]);

  // Auto-settle stale background positions (excluding the active modal trade)
  React.useEffect(() => {
    if (!positions?.length) return;
    const t = setInterval(() => {
      const ts = Date.now();
      positions.forEach((p: any) => {
        if (active?.id === p.id) return;
        if (new Date(p.closes_at).getTime() <= ts) {
          settleServer({ data: { tradeId: p.id, closePrice: getCurrentPrice() } })
            .then(() => qc.invalidateQueries())
            .catch(() => {});
        }
      });
    }, 1500);
    return () => clearInterval(t);
  }, [positions, active?.id, settleServer, qc]);


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

      {/* Active trade modal — countdown + result */}
      <AnimatePresence>
        {active && (
          <ActiveTradeModal
            active={active}
            now={now}
            livePrice={price}
            result={result}
            onClose={() => {
              setActive(null);
              setResult(null);
              settlingRef.current = false;
            }}
            onTradeAgain={() => {
              const dir = active.direction;
              setActive(null);
              setResult(null);
              settlingRef.current = false;
              setSheet(dir);
            }}
          />
        )}
      </AnimatePresence>


      {/* Bottom Sheet — Option Trade */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !openMut.isPending && setSheet(null)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] px-5 pt-3 shadow-2xl"
              style={{
                background: "oklch(0.16 0.03 265)",
                paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
              }}
            >
              {/* Grabber */}
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

              {/* Asset Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="size-12 rounded-xl grid place-items-center font-bold text-base shrink-0"
                  style={{
                    background: "linear-gradient(145deg, #E8C657, #B8862F)",
                    color: "oklch(0.18 0.04 265)",
                    clipPath:
                      "polygon(50% 0%, 100% 30%, 100% 70%, 50% 100%, 0% 70%, 0% 30%)",
                  }}
                >
                  ₮
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-white leading-tight">
                    Tether Gold
                  </div>
                  <div className="text-[11px] text-white/40 tracking-wide mt-0.5">
                    XAUTUSDT
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold text-white num">
                    ${fmtUSD(price)}
                  </div>
                  <div
                    className={`text-[11px] font-medium num mt-0.5 flex items-center justify-end gap-1 ${
                      up ? "text-success" : "text-destructive"
                    }`}
                  >
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        up ? "bg-success" : "bg-destructive"
                      }`}
                    />
                    {fmtPct(changePct)}
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/8 mb-5" />

              {/* Time */}
              <div className="mb-5">
                <div className="text-[15px] font-semibold text-white mb-3">
                  Time
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {DURATIONS.map((d) => {
                    const active = duration === d.s;
                    return (
                      <button
                        key={d.s}
                        onClick={() => setDuration(d.s)}
                        className="rounded-xl py-3 px-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                        style={
                          active
                            ? {
                                background: "linear-gradient(145deg, #E8C657, #B8862F)",
                                boxShadow:
                                  "0 8px 24px -8px oklch(0.75 0.15 85 / 0.5)",
                              }
                            : { background: "oklch(0.22 0.03 265)" }
                        }
                      >
                        <span
                          className={`text-[15px] font-bold num ${
                            active ? "text-[#1a1a2e]" : "text-white"
                          }`}
                        >
                          {d.label}
                        </span>
                        <span
                          className={`text-[10px] num ${
                            active ? "text-[#1a1a2e]/70" : "text-white/40"
                          }`}
                        >
                          Ror:{d.ror}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction Fees */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-white/50">Transaction Fees:</span>
                <span className="text-[13px] font-semibold text-gold num">$ 0.00</span>
              </div>

              {/* Quantity stepper */}
              <div
                className="flex items-center justify-between rounded-xl px-3 py-3 mb-4"
                style={{ background: "oklch(0.22 0.03 265)" }}
              >
                <button
                  onClick={() => setAmount(Math.max(1, amount - 1))}
                  disabled={openMut.isPending}
                  className="size-9 rounded-lg grid place-items-center text-white transition active:scale-90 disabled:opacity-50"
                  style={{ background: "oklch(0.28 0.03 265)" }}
                  aria-label="Decrease"
                >
                  <span className="text-xl leading-none">−</span>
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw === "") setAmount(1);
                    else setAmount(Math.min(100000, Math.max(1, parseInt(raw, 10))));
                  }}
                  disabled={openMut.isPending}
                  className="w-32 text-center bg-transparent text-xl font-semibold text-white num tabular-nums outline-none border-none focus:ring-0 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setAmount(Math.min(100000, amount + 1))}
                  disabled={openMut.isPending}
                  className="size-9 rounded-lg grid place-items-center text-white transition active:scale-90 disabled:opacity-50"
                  style={{ background: "oklch(0.28 0.03 265)" }}
                  aria-label="Increase"
                >
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>

              {/* Available balance */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-[13px] text-white/50">Available Balance:</span>
                <span className="text-[13px] font-semibold text-gold num">
                  {fmtUSD(balance)} USDT
                </span>
              </div>

              {/* Continue */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => openMut.mutate(sheet)}
                disabled={openMut.isPending || !canTrade}
                className="w-full py-4 rounded-2xl font-bold text-base tracking-wide disabled:opacity-45 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(145deg, #F0CD5C, #C99634)",
                  color: "oklch(0.18 0.04 265)",
                  boxShadow: "0 10px 30px -10px oklch(0.75 0.15 85 / 0.45)",
                }}
              >
                {openMut.isPending
                  ? "Opening..."
                  : !canTrade
                  ? "Insufficient Balance"
                  : "Continue"}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

void TrendingUp;
void Clock;
void Activity;
void ArrowUp;
void ArrowDown;
