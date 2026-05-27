import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { usePriceFeed } from "@/lib/price-feed";
import { PriceChart } from "@/components/PriceChart";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market")({
  head: () => ({ meta: [{ title: "Market — XAUT.trade" }] }),
  component: MarketPage,
});

const RANGES = ["1H", "1D", "1W", "1M", "ALL"] as const;

function MarketPage() {
  const { data, price, changePct } = usePriceFeed(120);
  const up = changePct >= 0;

  const stats = [
    { label: "24h High", value: `$${fmtUSD(price + 12.4)}` },
    { label: "24h Low", value: `$${fmtUSD(price - 9.1)}` },
    { label: "24h Vol", value: "$2.41B" },
    { label: "Spread", value: "0.02%" },
  ];

  const watchlist = [
    { sym: "XAU/USDT", name: "Tether Gold", price, pct: changePct },
    { sym: "BTC/USDT", name: "Bitcoin", price: 68420.55, pct: 1.42 },
    { sym: "ETH/USDT", name: "Ethereum", price: 3522.18, pct: -0.83 },
    { sym: "SOL/USDT", name: "Solana", price: 162.31, pct: 2.16 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Live market</p>
        <h1 className="font-display text-2xl font-semibold mt-1">XAU / USDT</h1>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-surface border border-border/60 p-5"
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Tether Gold</div>
            <div className="num text-3xl font-semibold mt-1">${fmtUSD(price)}</div>
          </div>
          <div className={`text-sm num font-medium ${up ? "text-success" : "text-destructive"}`}>
            {fmtPct(changePct)}
          </div>
        </div>

        <div className="mt-5 h-56 -mx-2"><PriceChart data={data} up={up} /></div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {RANGES.map((r, i) => (
            <button
              key={r}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                i === 1 ? "border-gold/40 text-gold bg-gold/5" : "border-border/60 text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface border border-border/50 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="num text-base font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-border/60">
          <h3 className="text-sm font-semibold">Watchlist</h3>
          <span className="text-[11px] text-muted-foreground">Indicative</span>
        </div>
        <ul>
          {watchlist.map((w, i) => {
            const wup = w.pct >= 0;
            return (
              <li key={w.sym} className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? "border-t border-border/40" : ""}`}>
                <div>
                  <div className="text-sm font-medium">{w.sym}</div>
                  <div className="text-xs text-muted-foreground">{w.name}</div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-medium">${fmtUSD(w.price)}</div>
                  <div className={`num text-xs ${wup ? "text-success" : "text-destructive"}`}>{fmtPct(w.pct)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        to="/trade"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-gold text-primary-foreground text-sm font-semibold shadow-gold-soft active:scale-[0.99] transition"
      >
        Trade XAU/USDT <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}
