import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CandlestickChart, LineChart, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePriceFeed } from "@/lib/price-feed";
import { PriceChart } from "@/components/PriceChart";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — XAUT.trade" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: chart, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
    enabled: !!user,
  });

  const { data: trades } = useQuery({
    queryKey: ["recent-trades", user?.id],
    queryFn: async () => (await supabase.from("trades").select("*").eq("user_id", user!.id).order("opened_at", { ascending: false }).limit(5)).data ?? [],
    enabled: !!user,
  });

  const balance = Number(wallet?.usdt_balance ?? 0);
  const locked = Number(wallet?.locked ?? 0);
  const total = balance + locked;

  const quick = [
    { to: "/wallet", label: "Deposit", icon: ArrowDownLeft },
    { to: "/wallet", label: "Withdraw", icon: ArrowUpRight },
    { to: "/trade", label: "Trade", icon: CandlestickChart },
    { to: "/market", label: "Market", icon: LineChart },
  ];

  const hour = new Date().getHours();
  const greet = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{greet}</p>
        <h1 className="font-display text-2xl font-semibold mt-1 truncate">{user?.email?.split("@")[0]}</h1>
      </div>

      {/* Balance card */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-gold/20 p-5"
        style={{ background: "linear-gradient(155deg, oklch(0.20 0.02 86 / 0.55), oklch(0.15 0.006 260) 60%)" }}
      >
        <div className="absolute -top-16 -right-12 size-48 rounded-full bg-gradient-gold opacity-[0.18] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-xs text-muted-foreground">Total balance</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="num text-3xl font-semibold tracking-tight">${fmtUSD(total)}</span>
            <span className="text-xs text-gold font-medium">USDT</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
              <div className="text-muted-foreground">Available</div>
              <div className="num mt-0.5 text-sm font-medium">${fmtUSD(balance)}</div>
            </div>
            <div className="rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
              <div className="text-muted-foreground">In positions</div>
              <div className="num mt-0.5 text-sm font-medium">${fmtUSD(locked)}</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <Link key={q.label} to={q.to} className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-surface border border-border/50 active:scale-95 transition">
            <div className="size-10 rounded-full bg-gold/10 grid place-items-center">
              <q.icon className="size-[18px] text-gold" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{q.label}</span>
          </Link>
        ))}
      </section>

      {/* Live chart */}
      <section className="rounded-2xl bg-surface border border-border/60 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">XAU / USDT</div>
            <div className="num text-2xl font-semibold mt-1">${fmtUSD(price)}</div>
          </div>
          <div className={`text-sm num font-medium ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)}</div>
        </div>
        <div className="h-44 mt-3 -mx-2"><PriceChart data={chart} up={up} /></div>
        <Link to="/trade" className="mt-3 flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-gradient-gold text-primary-foreground text-sm font-semibold shadow-gold-soft active:scale-[0.99] transition">
          <Plus className="size-4" /> Open trade
        </Link>
      </section>

      {/* Recent trades */}
      <section className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-border/60">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <Link to="/history" className="text-xs text-gold font-medium">View all</Link>
        </div>
        {trades?.length ? (
          <ul>
            {trades.map((t: any, i: number) => {
              const win = t.result === "win";
              const loss = t.result === "loss";
              return (
                <li key={t.id} className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? "border-t border-border/40" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 rounded-full grid place-items-center ${t.direction === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {t.direction === "buy" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{t.direction.toUpperCase()} · <span className="num">${fmtUSD(Number(t.amount))}</span></div>
                      <div className="text-[11px] text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`num text-sm font-medium ${win ? "text-success" : loss ? "text-destructive" : "text-muted-foreground"}`}>
                    {t.pnl != null ? `${Number(t.pnl) >= 0 ? "+" : ""}${fmtUSD(Number(t.pnl))}` : "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No trades yet.</p>
            <Link to="/trade" className="mt-3 inline-flex items-center gap-1 text-sm text-gold font-medium">
              Start trading <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
