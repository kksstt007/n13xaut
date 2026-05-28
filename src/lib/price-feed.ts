// Simulated XAU/USDT live price feed (random walk around base ~2350)
import * as React from "react";

const BASE = 2350;
let price = BASE;
const subs = new Set<(p: number, t: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  const drift = (Math.random() - 0.5) * 1.4;
  const mean = (BASE - price) * 0.002;
  price = Math.max(1500, Math.min(3500, price + drift + mean));
  const now = Date.now();
  subs.forEach((s) => s(price, now));
}

function ensureRunning() {
  if (!timer && typeof window !== "undefined") timer = setInterval(tick, 1000);
}

export function usePriceFeed(historySize = 60) {
  // Deterministic initial state so SSR markup matches the first client render.
  const [data, setData] = React.useState<{ t: number; p: number }[]>(() => {
    const arr: { t: number; p: number }[] = [];
    for (let i = historySize; i > 0; i--) {
      arr.push({ t: -i * 1000, p: BASE });
    }
    return arr;
  });

  React.useEffect(() => {
    // Seed real history with random walk after mount (client-only).
    setData(() => {
      const arr: { t: number; p: number }[] = [];
      let p = BASE;
      const now = Date.now();
      for (let i = historySize; i > 0; i--) {
        p += (Math.random() - 0.5) * 1.4;
        arr.push({ t: now - i * 1000, p });
      }
      return arr;
    });
    ensureRunning();
    const cb = (p: number, t: number) => {
      setData((prev) => [...prev.slice(-(historySize - 1)), { t, p }]);
    };
    subs.add(cb);
    return () => { subs.delete(cb); };
  }, [historySize]);

  const last = data[data.length - 1]?.p ?? BASE;
  const first = data[0]?.p ?? BASE;
  const change = last - first;
  const changePct = (change / first) * 100;
  return { data, price: last, change, changePct };
}

export function getCurrentPrice() { return price; }
