import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Activity, ArrowUpRight } from "lucide-react";
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
  const { data, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: trades } = useQuery({
    queryKey: ["recent-trades", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("trades").select("*").eq("user_id", user!.id).order("opened_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const stats = [
    { label: "USDT Balance", value: `$${fmtUSD(Number(wallet?.usdt_balance ?? 0))}`, icon: Wallet },
    { label: "In Positions", value: `$${fmtUSD(Number(wallet?.locked ?? 0))}`, icon: Activity },
    { label: "XAU/USDT", value: `$${fmtUSD(price)}`, icon: TrendingUp, sub: fmtPct(changePct), up },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <Link to="/trade" className="rounded-lg bg-gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold">
          Open trade
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-gold" />
            </div>
            <div className="mt-3 num text-2xl font-bold">{s.value}</div>
            {s.sub && <div className={`num text-xs mt-1 ${s.up ? "text-success" : "text-destructive"}`}>{s.sub}</div>}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground">XAU/USDT · Live</div>
              <div className="num text-3xl font-bold mt-1">${fmtUSD(price)}</div>
            </div>
            <div className={`num text-sm ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)}</div>
          </div>
          <div className="h-72"><PriceChart data={data} up={up} /></div>
        </div>
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-4">Recent trades</h3>
          <div className="space-y-2">
            {trades?.length ? trades.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div>
                  <div className="font-medium">{t.direction.toUpperCase()} · ${fmtUSD(Number(t.amount))}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</div>
                </div>
                <div className={`num text-sm ${t.result === "win" ? "text-success" : t.result === "loss" ? "text-destructive" : "text-muted-foreground"}`}>
                  {t.pnl != null ? `${Number(t.pnl) >= 0 ? "+" : ""}${fmtUSD(Number(t.pnl))}` : "—"}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No trades yet. <Link to="/trade" className="text-gold inline-flex items-center gap-1">Start trading <ArrowUpRight className="size-3" /></Link></p>}
          </div>
        </div>
      </div>
    </div>
  );
}
