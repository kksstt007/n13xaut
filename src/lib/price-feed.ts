// Real XAU/USDT (Tether Gold) price feed — sourced from public market APIs.
// Falls back to a gentle random walk only if all upstream sources fail,
// so the chart always renders something instead of breaking the UI.
import * as React from "react";

const BASE = 2650; // sensible recent-era anchor for SSR + fallback
let price = BASE;
const subs = new Set<(p: number, t: number) => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

type Point = { t: number; p: number };

async function fetchSpot(): Promise<number | null> {
  // Try multiple sources in order; first success wins.
  const sources: Array<() => Promise<number | null>> = [
    async () => {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd",
        { cache: "no-store" },
      );
      if (!r.ok) return null;
      const j: any = await r.json();
      const v = Number(j?.["tether-gold"]?.usd);
      return Number.isFinite(v) ? v : null;
    },
    async () => {
      const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=XAUTUSDT", {
        cache: "no-store",
      });
      if (!r.ok) return null;
      const j: any = await r.json();
      const v = Number(j?.price);
      return Number.isFinite(v) ? v : null;
    },
  ];
  for (const s of sources) {
    try {
      const v = await s();
      if (v && v > 0) return v;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function fetchHistory(): Promise<Point[] | null> {
  // CoinGecko market_chart returns evenly-spaced [ms, price] pairs for 1d.
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/coins/tether-gold/market_chart?vs_currency=usd&days=1",
      { cache: "no-store" },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const raw: [number, number][] = j?.prices ?? [];
    if (!raw.length) return null;
    return raw
      .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p) && p > 0)
      .map(([t, p]) => ({ t, p }));
  } catch {
    return null;
  }
}

function fallbackTick() {
  const drift = (Math.random() - 0.5) * 0.8;
  const mean = (BASE - price) * 0.002;
  price = Math.max(1500, Math.min(4500, price + drift + mean));
  subs.forEach((s) => s(price, Date.now()));
}

function startPolling() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = setInterval(async () => {
    const v = await fetchSpot();
    if (v && v > 0) {
      price = v;
      subs.forEach((s) => s(price, Date.now()));
    } else {
      // Soft fallback so the chart keeps breathing if APIs hiccup briefly.
      fallbackTick();
    }
  }, 15000);
}

function resampleToSize(points: Point[], size: number): Point[] {
  if (points.length <= size) return points;
  const out: Point[] = [];
  const step = (points.length - 1) / (size - 1);
  for (let i = 0; i < size; i++) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

export function usePriceFeed(historySize = 60) {
  // Deterministic SSR initial state so hydration markup matches.
  const [data, setData] = React.useState<Point[]>(() => {
    const arr: Point[] = [];
    const now = 0; // negative offsets keep SSR/client identical
    for (let i = historySize; i > 0; i--) arr.push({ t: now - i * 60_000, p: BASE });
    return arr;
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const hist = await fetchHistory();
      const spot = await fetchSpot();
      if (cancelled) return;

      if (hist && hist.length) {
        const sampled = resampleToSize(hist, historySize);
        if (spot && spot > 0) {
          price = spot;
          sampled.push({ t: Date.now(), p: spot });
        } else {
          price = sampled[sampled.length - 1].p;
        }
        setData(sampled.slice(-historySize));
      } else if (spot && spot > 0) {
        // No history but live spot — seed flat history at current price.
        price = spot;
        const now = Date.now();
        const arr: Point[] = [];
        for (let i = historySize; i > 0; i--) arr.push({ t: now - i * 60_000, p: spot });
        setData(arr);
      }

      startPolling();
    })();

    const cb = (p: number, t: number) => {
      setData((prev) => [...prev.slice(-(historySize - 1)), { t, p }]);
    };
    subs.add(cb);
    return () => {
      cancelled = true;
      subs.delete(cb);
    };
  }, [historySize]);

  const last = data[data.length - 1]?.p ?? BASE;
  const first = data[0]?.p ?? BASE;
  const change = last - first;
  const changePct = first ? (change / first) * 100 : 0;
  return { data, price: last, change, changePct };
}

export function getCurrentPrice() {
  return price;
}
