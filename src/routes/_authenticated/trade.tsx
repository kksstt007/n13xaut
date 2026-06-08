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

  // Derived market stats (presentational only — derived from live feed)
  const high24 = React.useMemo(() => Math.max(...chart.map((d) => d.p), price), [chart, price]);
  const low24 = React.useMemo(() => Math.min(...chart.map((d) => d.p), price), [chart, price]);
  const spread = Math.max(0.02, price * 0.00008);
  const bid = price - spread / 2;
  const ask = price + spread / 2;

  return (
    <div className="flex flex-col gap-4 pb-6">
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
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight">XAU₮ / USDT</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/15 text-success text-[9px] font-bold tracking-wider">
              <span className="size-1 rounded-full bg-success animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wide mt-0.5">Tether Gold · Spot</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-elevated border border-border/50">
          <Wallet className="size-3.5 text-gold" />
          <span className="text-xs font-medium num">${fmtUSD(balance)}</span>
        </div>
      </div>

      {/* Price block */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-end justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <motion.span
              key={Math.floor(price * 100)}
              initial={{ opacity: 0.5, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className={`num text-[38px] sm:text-5xl font-bold tracking-tight leading-none ${
                up ? "text-success" : "text-destructive"
              }`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fmtUSD(price)}
            </motion.span>
            <span className="text-xs text-muted-foreground font-medium">USDT</span>
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-1 text-[12px] font-semibold num ${
              up ? "text-success" : "text-destructive"
            }`}
          >
            {up ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />}
            <span>{up ? "+" : "−"}${fmtUSD(Math.abs(change))}</span>
            <span className="opacity-70">({fmtPct(changePct)})</span>
            <span className="text-muted-foreground font-medium ml-1">· 24h</span>
          </div>
        </div>

        {/* Bid / Ask */}
        <div className="flex gap-1.5 shrink-0">
          <div className="px-2.5 py-1.5 rounded-xl bg-success/10 border border-success/20 text-right">
            <div className="text-[9px] uppercase tracking-wider text-success/80 font-semibold">Bid</div>
            <div className="num text-[12px] font-bold text-success leading-tight">{fmtUSD(bid)}</div>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-right">
            <div className="text-[9px] uppercase tracking-wider text-destructive/80 font-semibold">Ask</div>
            <div className="num text-[12px] font-bold text-destructive leading-tight">{fmtUSD(ask)}</div>
          </div>
        </div>
      </motion.div>

      {/* Timeframe pills */}
      <div className="flex items-center justify-between gap-1 -mb-1">
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-surface/60 border border-border/40">
          {TIMEFRAMES.map((t) => {
            const isActive = tf === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTf(t.id)}
                className={`relative px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-colors ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
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
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Activity className="size-3" />
          <span className="num">Realtime</span>
        </div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative rounded-3xl border border-border/40 bg-surface/60 p-3 sm:p-4 shadow-elevated overflow-hidden"
      >
        <div className="h-[240px] sm:h-[300px]">
          <PriceChart data={chart} up={up} />
        </div>
        {/* Floating price tag on chart */}
        <div
          className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold num ${
            up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}
        >
          {fmtUSD(price)}
        </div>
      </motion.div>

      {/* 24h stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl px-3 py-2 bg-surface/50 border border-border/40">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">24h High</div>
          <div className="text-[12px] font-semibold num text-success mt-0.5">${fmtUSD(high24)}</div>
        </div>
        <div className="rounded-xl px-3 py-2 bg-surface/50 border border-border/40">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">24h Low</div>
          <div className="text-[12px] font-semibold num text-destructive mt-0.5">${fmtUSD(low24)}</div>
        </div>
        <div className="rounded-xl px-3 py-2 bg-surface/50 border border-border/40">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Spread</div>
          <div className="text-[12px] font-semibold num text-foreground mt-0.5">${spread.toFixed(2)}</div>
        </div>
      </div>

      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-3 mt-1">
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
            <div className="flex flex-col items-start leading-none">
              <span>BUY</span>
              <span className="text-[9px] opacity-70 font-semibold mt-0.5 num">{fmtUSD(ask)}</span>
            </div>
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
            <div className="flex flex-col items-start leading-none">
              <span>SELL</span>
              <span className="text-[9px] opacity-80 font-semibold mt-0.5 num">{fmtUSD(bid)}</span>
            </div>
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
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" /> Auto-settle
          </span>
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

function ActiveTradeModal({
  active,
  now,
  livePrice,
  result,
  onClose,
  onTradeAgain,
}: {
  active: ActiveTrade;
  now: number;
  livePrice: number;
  result: TradeResult | null;
  onClose: () => void;
  onTradeAgain: () => void;
}) {
  const total = active.durationSec * 1000;
  const elapsed = Math.min(total, Math.max(0, now - active.openedAt));
  const remainingMs = Math.max(0, active.closesAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  const progress = total > 0 ? elapsed / total : 0;

  const isBuy = active.direction === "buy";
  const dirColor = isBuy ? "oklch(0.70 0.16 156)" : "oklch(0.66 0.18 22)";
  const dirLabel = isBuy ? "BUY · LONG" : "SELL · SHORT";

  const projectedWin = active.amount * (active.payoutPct / 100);
  const settling = remainingMs <= 0 && !result;

  const isWin = result?.result === "win";
  const pnl = Number(result?.pnl ?? 0);

  const R = 86;
  const C = 2 * Math.PI * R;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="fixed inset-0 z-50 grid place-items-center p-5"
      >
        <div
          className="w-full max-w-sm rounded-[28px] overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: "oklch(0.16 0.03 265)" }}
        >
          <div
            className="px-5 pt-5 pb-4 flex items-center justify-between"
            style={{
              background: result
                ? isWin
                  ? "linear-gradient(180deg, oklch(0.30 0.12 156 / 0.6), transparent)"
                  : "linear-gradient(180deg, oklch(0.32 0.14 22 / 0.55), transparent)"
                : "linear-gradient(180deg, oklch(0.30 0.06 265 / 0.5), transparent)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
                style={{ background: dirColor, color: "oklch(0.10 0.01 260)" }}
              >
                {isBuy ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />}
                {dirLabel}
              </span>
              <span className="text-[11px] text-white/50 font-medium">XAU₮/USDT</span>
            </div>
            {result && (
              <button
                onClick={onClose}
                className="size-8 rounded-full grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>

          <div className="px-6 pb-6">
            {!result ? (
              <>
                <div className="relative mx-auto mt-2 mb-5" style={{ width: 200, height: 200 }}>
                  <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                    <circle cx="100" cy="100" r={R} stroke="oklch(0.26 0.03 265)" strokeWidth="10" fill="none" />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r={R}
                      stroke={dirColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={C}
                      strokeDashoffset={C * progress}
                      style={{ filter: `drop-shadow(0 0 12px ${dirColor})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
                        {settling ? "Settling" : "Closes in"}
                      </div>
                      <div
                        className="num font-bold text-white tabular-nums mt-1"
                        style={{ fontSize: 44, lineHeight: 1, fontFamily: "var(--font-display)" }}
                      >
                        {settling ? "…" : `${mm}:${ss}`}
                      </div>
                      <div className="text-[11px] text-white/50 num mt-1.5">
                        of {active.durationSec}s
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <Stat label="Stake" value={`$${fmtUSD(active.amount)}`} />
                  <Stat label="Payout" value={`${active.payoutPct}%`} accent />
                  <Stat label="Open price" value={`$${fmtUSD(active.openPrice)}`} />
                  <Stat
                    label="Live price"
                    value={`$${fmtUSD(livePrice)}`}
                    valueClass={
                      livePrice === active.openPrice
                        ? "text-white"
                        : (isBuy ? livePrice > active.openPrice : livePrice < active.openPrice)
                        ? "text-success"
                        : "text-destructive"
                    }
                  />
                </div>

                <div
                  className="rounded-xl px-3.5 py-3 flex items-center justify-between"
                  style={{ background: "oklch(0.22 0.03 265)" }}
                >
                  <span className="text-[12px] text-white/60">If win, you receive</span>
                  <span className="text-[14px] font-bold num text-gold">
                    +${fmtUSD(projectedWin)}
                  </span>
                </div>

                <p className="text-center text-[11px] text-white/35 mt-4">
                  Trade will settle automatically when the timer ends.
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 220 }}
                  className="mx-auto mt-3 mb-4 size-24 rounded-full grid place-items-center"
                  style={{
                    background: isWin
                      ? "radial-gradient(circle, oklch(0.70 0.16 156 / 0.35), transparent 70%)"
                      : "radial-gradient(circle, oklch(0.66 0.18 22 / 0.35), transparent 70%)",
                  }}
                >
                  <div
                    className="size-16 rounded-full grid place-items-center text-3xl font-black"
                    style={{
                      background: isWin
                        ? "linear-gradient(145deg, oklch(0.74 0.16 156), oklch(0.58 0.14 150))"
                        : "linear-gradient(145deg, oklch(0.70 0.18 22), oklch(0.56 0.17 18))",
                      color: "white",
                      boxShadow: isWin
                        ? "0 12px 32px -10px oklch(0.60 0.15 156 / 0.7)"
                        : "0 12px 32px -10px oklch(0.60 0.18 22 / 0.7)",
                    }}
                  >
                    {isWin ? "✓" : "✕"}
                  </div>
                </motion.div>

                <div className="text-center">
                  <div
                    className={`text-[11px] uppercase tracking-[0.25em] font-semibold ${
                      isWin ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isWin ? "Trade Won" : "Trade Lost"}
                  </div>
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`num font-bold tabular-nums mt-1.5 ${
                      isWin ? "text-success" : "text-destructive"
                    }`}
                    style={{ fontSize: 38, fontFamily: "var(--font-display)" }}
                  >
                    {pnl >= 0 ? "+" : "−"}${fmtUSD(Math.abs(pnl))}
                  </motion.div>
                  <div className="text-[12px] text-white/45 mt-1">
                    {isWin
                      ? `Payout at ${active.payoutPct}% of $${fmtUSD(active.amount)}`
                      : `Stake of $${fmtUSD(active.amount)} lost`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  <Stat label="Open" value={`$${fmtUSD(active.openPrice)}`} />
                  <Stat label="Close" value={`$${fmtUSD(result.closePrice)}`} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <button
                    onClick={onClose}
                    className="py-3 rounded-xl text-[13px] font-semibold text-white/80 hover:text-white transition"
                    style={{ background: "oklch(0.22 0.03 265)" }}
                  >
                    Close
                  </button>
                  <button
                    onClick={onTradeAgain}
                    className="py-3 rounded-xl text-[13px] font-bold"
                    style={{
                      background: "linear-gradient(145deg, #F0CD5C, #C99634)",
                      color: "oklch(0.18 0.04 265)",
                      boxShadow: "0 10px 28px -10px oklch(0.75 0.15 85 / 0.5)",
                    }}
                  >
                    Trade again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ background: "oklch(0.22 0.03 265)" }}>
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</div>
      <div
        className={`text-[14px] font-semibold num tabular-nums mt-0.5 ${
          valueClass ?? (accent ? "text-gold" : "text-white")
        }`}
      >
        {value}
      </div>
    </div>
  );
}

void TrendingUp;

