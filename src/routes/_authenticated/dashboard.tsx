import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpFromLine, ArrowUpRight, CandlestickChart, Coins, Eye, EyeOff, History, LifeBuoy, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HomeBanners } from "@/components/HomeBanners";
import { FundsSheet } from "@/components/DepositWithdraw";
import { WithdrawWizard } from "@/components/WithdrawWizard";
import { Button } from "@/components/ui/button";
import { fmtUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Home — XAUT.trade" },
    { name: "description", content: "Your XAUT.trade account overview, Tether Gold market snapshot, open positions and recent trading activity." },
    { property: "og:title", content: "Home — XAUT.trade" },
    { property: "og:description", content: "Track your account, explore gold trading and manage your investment plans." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const [balanceVisible, setBalanceVisible] = React.useState(true);
  const [fundsAction, setFundsAction] = React.useState<"deposit" | "withdraw" | null>(null);
  const [activity, setActivity] = React.useState<"open" | "recent">("open");
  const { data: profile } = useQuery({
    queryKey: ["profile-name", userId], enabled: !!userId, staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles_safe" as any).select("display_name").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data as { display_name: string | null } | null;
    },
  });
  const wallet = useQuery({
    queryKey: ["wallet", userId], enabled: !!userId, refetchInterval: 15_000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("wallets").select("usdt_balance").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const investments = useQuery({
    queryKey: ["investments-mini", userId], enabled: !!userId, staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("investments").select("id, amount, daily_rate, end_at, status").eq("user_id", userId).eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });
  const openTrades = useQuery({
    queryKey: ["open-trades-mini", userId], enabled: !!userId, refetchInterval: 5_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("trades").select("id, amount, direction, opened_at, closes_at").eq("user_id", userId).eq("status", "open").order("closes_at", { ascending: true }).limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });
  const recentTrades = useQuery({
    queryKey: ["recent-trades-mini", userId], enabled: !!userId, staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("trades").select("id, direction, amount, pnl, result, settled_at").eq("user_id", userId).eq("status", "settled").order("settled_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });
  const market = useQuery({
    queryKey: ["home-gold-snapshot"], refetchInterval: 30_000, retry: 1, staleTime: 20_000,
    queryFn: async ({ signal }) => {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true", { signal });
      if (!response.ok) throw new Error("Market quote unavailable");
      const result = (await response.json())["tether-gold"];
      const price = Number(result?.usd);
      const change = result?.usd_24h_change == null ? null : Number(result.usd_24h_change);
      if (!Number.isFinite(price) || price <= 0) throw new Error("Market quote unavailable");
      return { price, change: change !== null && Number.isFinite(change) ? change : null };
    },
  });
  const balance = Number(wallet.data?.usdt_balance ?? 0);
  const invested = (investments.data ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  const name = profile?.display_name || "Trader";
  const amount = (value: number, loading: boolean, error: boolean) => !balanceVisible ? "••••••" : loading ? "…" : error ? "—" : fmtUSD(value);
  const activityQuery = activity === "open" ? openTrades : recentTrades;

  return (
    <div className="space-y-5 pb-3">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Welcome back, {name}</p>
          <h1 className="font-display text-xl font-semibold mt-0.5">Account overview</h1>
        </div>
        <Button asChild variant="ghost" size="icon" className="rounded-full bg-surface border border-border" aria-label="Contact support"><Link to="/support"><LifeBuoy className="text-muted-foreground" /></Link></Button>
      </header>

      <HomeBanners />

      <section className="home-balance-glass rounded-[8px] p-5 sm:p-6" aria-label="Account balance">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs text-muted-foreground">Estimated total balance</h2>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={balanceVisible ? "Hide balance" : "Show balance"} title={balanceVisible ? "Hide balance" : "Show balance"} onClick={() => setBalanceVisible(!balanceVisible)}>{balanceVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button>
          </div>
          <Button asChild variant="link" className="h-7 p-0 text-[11px]"><Link to="/profile">Assets<ArrowUpRight /></Link></Button>
        </div>
        <div className="flex items-baseline flex-wrap gap-2 mt-1"><span className="num font-display text-3xl font-semibold break-all">{amount(balance + invested, wallet.isPending || investments.isPending, wallet.isError || investments.isError)}</span><span className="text-xs text-muted-foreground">USDT</span></div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div><p className="text-[11px] text-muted-foreground">Available</p><p className="num text-sm font-medium mt-1">{amount(balance, wallet.isPending, wallet.isError)} <span className="text-[10px] text-muted-foreground">USDT</span></p></div>
          <div className="border-l border-border pl-4"><p className="text-[11px] text-muted-foreground">In investment plans</p><p className="num text-sm font-medium mt-1">{amount(invested, investments.isPending, investments.isError)} <span className="text-[10px] text-muted-foreground">USDT</span></p></div>
        </div>
        {(wallet.isError || investments.isError) && <p className="text-xs text-destructive mt-2">Balance unavailable. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => { void wallet.refetch(); void investments.refetch(); }}>Retry</Button></p>}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-foreground/10">
          <Button variant="ghost" className="group h-20 flex-col gap-2 rounded-[8px] hover:bg-foreground/5" onClick={() => setFundsAction("deposit")}><span className="flex size-10 items-center justify-center rounded-full bg-gold text-primary-foreground transition-transform motion-safe:group-hover:-translate-y-0.5"><ArrowDownToLine className="size-5" /></span><span className="text-xs font-medium">Deposit</span></Button>
          <Button variant="ghost" className="group h-20 flex-col gap-2 rounded-[8px] hover:bg-foreground/5" disabled={wallet.isPending || wallet.isError} onClick={() => setFundsAction("withdraw")}><span className="flex size-10 items-center justify-center rounded-full bg-foreground/10 text-foreground border border-foreground/15 transition-transform motion-safe:group-hover:-translate-y-0.5"><ArrowUpFromLine className="size-5" /></span><span className="text-xs font-medium">Withdraw</span></Button>
        </div>
      </section>

      <nav className="grid grid-cols-4 border-y border-border py-3" aria-label="Quick access">
        <Shortcut to="/trade" icon={CandlestickChart} label="Trade" />
        <Shortcut to="/invest" icon={Coins} label="Gold Earn" />
        <Shortcut to="/history" icon={History} label="History" />
        <Shortcut to="/kyc" icon={Wallet} label="Verify ID" />
      </nav>

      <section aria-label="Gold market">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Market overview</h2><Button asChild variant="link" className="h-6 p-0 text-[11px]"><Link to="/market">View market<ArrowUpRight /></Link></Button></div>
        <Link to="/market" className="flex items-center justify-between gap-3 py-3 border-y border-border/60 hover:bg-surface transition-colors">
          <div className="flex gap-3 items-center min-w-0"><span className="size-9 shrink-0 rounded-full bg-gold/10 text-gold flex items-center justify-center"><Coins className="size-5" /></span><div><p className="text-[13px] font-semibold">XAU₮ / USDT</p><p className="text-[10px] text-muted-foreground mt-1">Tether Gold</p></div></div>
          <div className="text-right"><p className="num text-sm font-semibold">{market.data ? `$${fmtUSD(market.data.price)}` : "—"}</p><p className="text-[10px] text-muted-foreground mt-1">{market.isPending ? "Loading quote" : market.isError ? "Quote unavailable" : "Spot price"}</p></div>
          <div className="text-right shrink-0"><p className={`num text-[11px] font-semibold ${market.data?.change == null ? "text-muted-foreground" : market.data.change >= 0 ? "text-success" : "text-destructive"}`}>{market.data?.change == null ? "—" : `${market.data.change >= 0 ? "+" : ""}${market.data.change.toFixed(2)}%`}</p><p className="text-[10px] text-muted-foreground mt-1">24h change</p></div>
        </Link>
      </section>

      <section aria-label="Trading activity">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Trading activity</h2><Button asChild variant="link" className="h-6 p-0 text-[11px]"><Link to="/history">View all<ArrowUpRight /></Link></Button></div>
        <div className="flex gap-5 border-b border-border mt-2" role="tablist" aria-label="Trading activity views">
          <Button id="home-open-tab" role="tab" aria-controls="home-activity-panel" aria-selected={activity === "open"} variant="ghost" className={`h-10 px-0 rounded-none border-b-2 text-xs hover:bg-transparent ${activity === "open" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setActivity("open")}>Open positions{openTrades.data?.length ? ` (${openTrades.data.length})` : ""}</Button>
          <Button id="home-recent-tab" role="tab" aria-controls="home-activity-panel" aria-selected={activity === "recent"} variant="ghost" className={`h-10 px-0 rounded-none border-b-2 text-xs hover:bg-transparent ${activity === "recent" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setActivity("recent")}>Recent trades</Button>
        </div>
        <div id="home-activity-panel" role="tabpanel" aria-labelledby={`home-${activity}-tab`}>
          {activityQuery.isPending ? <p className="text-xs text-muted-foreground py-6 text-center">Loading activity…</p> : activityQuery.isError ? <div className="text-center py-5"><p className="text-xs text-muted-foreground">Activity unavailable</p><Button variant="link" size="sm" onClick={() => { void activityQuery.refetch(); }}>Retry</Button></div> : !(activityQuery.data?.length) ? <div className="flex flex-col items-center py-6"><CandlestickChart className="size-6 text-muted-foreground/50 mb-2" /><p className="text-xs text-muted-foreground">{activity === "open" ? "No open positions" : "No recent trades"}</p><Button asChild variant="link" size="sm" className="mt-1"><Link to="/trade">Go to trading<ArrowUpRight /></Link></Button></div> : (
            <ul className="divide-y divide-border/60">
              {activity === "open" ? openTrades.data?.map((trade) => <li key={trade.id} className="flex justify-between items-center gap-3 py-3"><div className="flex items-center gap-2"><Direction buy={trade.direction === "buy"} /><span className="num text-xs">{fmtUSD(Number(trade.amount))} USDT</span></div><Countdown closesAt={trade.closes_at} /></li>) : recentTrades.data?.map((trade) => <li key={trade.id} className="flex justify-between items-center gap-3 py-3"><div><div className="flex items-center gap-2"><Direction buy={trade.direction === "buy"} /><span className="num text-xs">{fmtUSD(Number(trade.amount))} USDT</span></div><p className="text-[10px] text-muted-foreground mt-1">{trade.settled_at ? new Date(trade.settled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p></div><span className={`num text-xs font-medium ${Number(trade.pnl) >= 0 ? "text-success" : "text-destructive"}`}>{Number(trade.pnl) >= 0 ? "+" : "−"}{fmtUSD(Math.abs(Number(trade.pnl ?? 0)))}</span></li>)}
            </ul>
          )}
        </div>
      </section>

      <footer role="contentinfo" className="border-t border-border pt-6 mt-8" aria-label="Platform footer">
        <div className="flex items-baseline justify-between gap-3 mb-5"><p className="font-display text-base font-semibold">XAUT<span className="text-gold">.trade</span></p><span className="text-[10px] text-muted-foreground">Gold trading</span></div>
        <div className="grid grid-cols-2 gap-6">
          <nav aria-label="Footer markets" className="flex flex-col items-start gap-1"><h2 className="text-xs font-semibold mb-1">Markets & products</h2>{([{ to: "/market", label: "Gold market" }, { to: "/trade", label: "Trade XAU₮" }, { to: "/invest", label: "Gold Earn" }] as const).map(item => <Button key={item.to} asChild variant="link" className="h-8 p-0 text-[11px] text-muted-foreground hover:text-gold"><Link to={item.to}>{item.label}</Link></Button>)}</nav>
          <nav aria-label="Footer support" className="flex flex-col items-start gap-1"><h2 className="text-xs font-semibold mb-1">Support & legal</h2>{([{ to: "/support", label: "Help & support" }, { to: "/kyc", label: "Identity verification" }, { to: "/terms", label: "Terms & conditions" }] as const).map(item => <Button key={item.to} asChild variant="link" className="h-8 p-0 text-[11px] text-muted-foreground hover:text-gold"><Link to={item.to}>{item.label}</Link></Button>)}</nav>
        </div>
        <div className="border-t border-border mt-5 pt-4 space-y-3"><p className="text-[10px] leading-relaxed text-muted-foreground"><span className="font-medium text-foreground/70">Risk notice.</span> Digital assets and gold prices can fluctuate. Trading involves risk of loss. Returns are not guaranteed.</p><p className="text-[10px] text-muted-foreground">© XAUT.trade. All rights reserved.</p></div>
      </footer>
      {fundsAction === "deposit" && <FundsSheet open mode="deposit" onClose={() => setFundsAction(null)} available={balance} />}
      <WithdrawWizard open={fundsAction === "withdraw"} onClose={() => setFundsAction(null)} available={balance} />
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: "/trade" | "/invest" | "/history" | "/kyc"; icon: typeof Coins; label: string }) {
  return <Button asChild variant="ghost" className="h-16 flex-col gap-2 px-1 text-[11px]"><Link to={to}><Icon className="size-5 text-gold" />{label}</Link></Button>;
}
function Direction({ buy }: { buy: boolean }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${buy ? "text-success" : "text-destructive"}`}>{buy ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{buy ? "BUY" : "SELL"}</span>;
}
function Countdown({ closesAt }: { closesAt: string }) {
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const remaining = Math.max(0, Math.ceil((new Date(closesAt).getTime() - now) / 1000));
  return <span className="num text-xs text-muted-foreground">{remaining === 0 ? "Settling…" : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</span>;
}
