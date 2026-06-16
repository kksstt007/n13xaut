import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import * as React from "react";
import {
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Gauge,
} from "lucide-react";
import { usePriceFeed, useCandles } from "@/lib/price-feed";
import { CandleChart } from "@/components/CandleChart";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market")({
  head: () => ({ meta: [{ title: "Market — XAUT.trade" }] }),
  component: MarketPage,
});

const TIMEFRAMES = [
  { id: "1D", label: "1D" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "ALL", label: "All" },
] as const;
type TF = (typeof TIMEFRAMES)[number]["id"];

// ── Indicators ──────────────────────────────────────────────────────────────
function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgG = gains / period;
  const avgL = losses / period;
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

function volatility(closes: number[]): number {
  if (closes.length < 2) return 0;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * 100;
}

function MarketPage() {
  const { price, changePct, change } = usePriceFeed(120);
  const up = changePct >= 0;
  const [tf, setTf] = React.useState<TF>("1D");
  const { data: candles, loading } = useCandles(tf);

  const closes = React.useMemo(() => candles.map((c) => c.c), [candles]);
  const sma20 = React.useMemo(() => {
    const arr = sma(closes, 20);
    return arr[arr.length - 1];
  }, [closes]);
  const sma50 = React.useMemo(() => {
    const arr = sma(closes, 50);
    return arr[arr.length - 1];
  }, [closes]);
  const rsi14 = React.useMemo(() => rsi(closes, 14), [closes]);
  const vol = React.useMemo(() => volatility(closes), [closes]);

  const periodHigh = candles.length ? Math.max(...candles.map((c) => c.h)) : price;
  const periodLow = candles.length ? Math.min(...candles.map((c) => c.l)) : price;
  const periodOpen = candles[0]?.o ?? price;
  const periodChange = price - periodOpen;
  const periodChangePct = periodOpen ? (periodChange / periodOpen) * 100 : 0;
  const range = Math.max(0.0001, periodHigh - periodLow);
  const pricePos = Math.max(0, Math.min(1, (price - periodLow) / range));

  // Signal synthesis
  const trendSignal =
    sma20 && sma50 ? (sma20 > sma50 ? "Bullish" : "Bearish") : "Neutral";
  const rsiSignal =
    rsi14 == null
      ? "—"
      : rsi14 > 70
      ? "Overbought"
      : rsi14 < 30
      ? "Oversold"
      : rsi14 > 55
      ? "Bullish"
      : rsi14 < 45
      ? "Bearish"
      : "Neutral";

  const spread = Math.max(0.02, price * 0.00008);
  const bid = price - spread / 2;
  const ask = price + spread / 2;

  // Watchlist & synthetic order book removed: showed stale or fabricated data,
  // which is a credibility / regulatory risk on a real trading platform.

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Live market
          </p>
          <h1 className="font-display text-2xl font-semibold mt-1 flex items-center gap-2">
            XAU₮ / USDT
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/15 text-success text-[9px] font-bold tracking-wider">
              <span className="size-1 rounded-full bg-success animate-pulse" />
              LIVE
            </span>
          </h1>
          <div className="text-[11px] text-muted-foreground mt-0.5">Tether Gold · Spot</div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`num text-2xl font-bold leading-none ${
              up ? "text-success" : "text-destructive"
            }`}
          >
            ${fmtUSD(price)}
          </div>
          <div
            className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold num ${
              up ? "text-success" : "text-destructive"
            }`}
          >
            {up ? (
              <ArrowUp className="size-3" strokeWidth={3} />
            ) : (
              <ArrowDown className="size-3" strokeWidth={3} />
            )}
            <span>
              {up ? "+" : "−"}${fmtUSD(Math.abs(change))}
            </span>
            <span className="opacity-70">({fmtPct(changePct)})</span>
          </div>
        </div>
      </div>

      {/* Bid / Ask / Spread */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 rounded-xl bg-success/10 border border-success/20">
          <div className="text-[9px] uppercase tracking-wider text-success/80 font-semibold">
            Bid
          </div>
          <div className="num text-sm font-bold text-success leading-tight mt-0.5">
            ${fmtUSD(bid)}
          </div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="text-[9px] uppercase tracking-wider text-destructive/80 font-semibold">
            Ask
          </div>
          <div className="num text-sm font-bold text-destructive leading-tight mt-0.5">
            ${fmtUSD(ask)}
          </div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-surface border border-border/50">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Spread
          </div>
          <div className="num text-sm font-bold text-foreground leading-tight mt-0.5">
            ${spread.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Timeframe pills */}
      <div className="flex items-center justify-between gap-1">
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
                    layoutId="market-tf-pill"
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

      {/* Candle chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-3xl border border-border/40 bg-surface/60 p-3 shadow-elevated overflow-hidden"
      >
        <div className="h-[280px]">
          <CandleChart data={candles} tfLabel={tf} />
        </div>
        {loading && candles.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Loading {tf} candles…
          </div>
        )}
      </motion.div>

      {/* Period stats */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard label={`${tf} Open`} value={`$${fmtUSD(periodOpen)}`} />
        <StatCard
          label={`${tf} Change`}
          value={`${periodChange >= 0 ? "+" : "−"}$${fmtUSD(Math.abs(periodChange))}`}
          sub={fmtPct(periodChangePct)}
          tone={periodChange >= 0 ? "up" : "down"}
        />
        <StatCard label={`${tf} High`} value={`$${fmtUSD(periodHigh)}`} tone="up" />
        <StatCard label={`${tf} Low`} value={`$${fmtUSD(periodLow)}`} tone="down" />
      </section>

      {/* Price position in range */}
      <section className="rounded-2xl bg-surface border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-gold" />
            <h3 className="text-sm font-semibold">Price position · {tf}</h3>
          </div>
          <span className="text-[11px] text-muted-foreground num">
            {(pricePos * 100).toFixed(0)}% of range
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-border/40 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-destructive/60 via-gold/60 to-success/60"
            style={{ width: "100%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-foreground border-2 border-background shadow"
            style={{ left: `calc(${pricePos * 100}% - 6px)` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground num mt-2">
          <span>${fmtUSD(periodLow)}</span>
          <span>${fmtUSD(periodHigh)}</span>
        </div>
      </section>

      {/* Technical analysis */}
      <section className="rounded-2xl bg-surface border border-border/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <BarChart3 className="size-4 text-gold" />
          <h3 className="text-sm font-semibold">Technical analysis · {tf}</h3>
        </div>
        <div className="divide-y divide-border/40">
          <AnalysisRow
            label="Trend (SMA 20 vs 50)"
            value={
              sma20 && sma50
                ? `${fmtUSD(sma20)} / ${fmtUSD(sma50)}`
                : "Insufficient data"
            }
            signal={trendSignal}
          />
          <AnalysisRow
            label="Momentum (RSI 14)"
            value={rsi14 != null ? rsi14.toFixed(1) : "—"}
            signal={rsiSignal}
            meter={rsi14 != null ? rsi14 / 100 : undefined}
          />
          <AnalysisRow
            label="Volatility"
            value={`${vol.toFixed(2)}% σ`}
            signal={vol > 1.5 ? "High" : vol > 0.7 ? "Normal" : "Low"}
          />
          <AnalysisRow
            label="Sentiment"
            value={`${fmtPct(periodChangePct)} ${tf}`}
            signal={periodChangePct >= 0 ? "Bullish" : "Bearish"}
          />
        </div>
      </section>

      {/* Watchlist & order book removed — only real, live XAU₮ data is shown. */}


      <Link
        to="/trade"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-gold text-primary-foreground text-sm font-semibold shadow-gold-soft active:scale-[0.99] transition"
      >
        Trade XAU/USDT <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl bg-surface border border-border/50 p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-base font-semibold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className={`num text-[11px] mt-0.5 ${toneClass} opacity-80`}>{sub}</div>}
    </div>
  );
}

function AnalysisRow({
  label,
  value,
  signal,
  meter,
}: {
  label: string;
  value: string;
  signal: string;
  meter?: number;
}) {
  const tone =
    signal === "Bullish" || signal === "Oversold"
      ? "text-success bg-success/10 border-success/20"
      : signal === "Bearish" || signal === "Overbought"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : signal === "High"
      ? "text-gold bg-gold/10 border-gold/20"
      : "text-muted-foreground bg-surface-elevated border-border/40";
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="num text-sm font-semibold mt-0.5 truncate">{value}</div>
        </div>
        <span
          className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide border ${tone}`}
        >
          {signal}
        </span>
      </div>
      {meter != null && (
        <div className="mt-2 h-1.5 rounded-full bg-border/40 overflow-hidden">
          <div
            className={`h-full ${
              meter > 0.7
                ? "bg-destructive"
                : meter < 0.3
                ? "bg-success"
                : "bg-gold"
            }`}
            style={{ width: `${Math.max(0, Math.min(1, meter)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
