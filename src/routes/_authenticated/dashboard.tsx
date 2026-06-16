import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Wallet,
  CandlestickChart,
  Coins,
  Gift,
  History as HistoryIcon,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePriceFeed } from "@/lib/price-feed";
import { PriceChart } from "@/components/PriceChart";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — XAUT.trade" }] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { data: chart, price, change, changePct } = usePriceFeed(60);
  const up = changePct >= 0;

  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () =>
      (
        await (supabase.from("profiles_safe" as any).select("display_name").eq("id", user!.id).maybeSingle() as any)
      ).data,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("wallets").select("usdt_balance").eq("user_id", user!.id).maybeSingle()).data,
    refetchInterval: 15_000,
  });

  const { data: openTrades } = useQuery({
    queryKey: ["open-trades-mini", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("trades")
        .select("id, amount, direction, opened_at, closes_at")
        .eq("user_id", user!.id)
        .eq("status", "open")
        .order("closes_at", { ascending: true })
        .limit(3)).data ?? [],
    refetchInterval: 5_000,
  });

  const { data: recentTrades } = useQuery({
    queryKey: ["recent-trades-mini", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("trades")
        .select("id, direction, amount, pnl, result, settled_at")
        .eq("user_id", user!.id)
        .eq("status", "settled")
        .order("settled_at", { ascending: false })
        .limit(4)).data ?? [],
    staleTime: 30_000,
  });

  const { data: investments } = useQuery({
    queryKey: ["investments-mini", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("investments")
        .select("id, amount, daily_rate, end_at, status")
        .eq("user_id", user!.id)
        .eq("status", "active")).data ?? [],
    staleTime: 30_000,
  });

  const balance = Number(wallet?.usdt_balance ?? 0);
  const investedTotal = (investments ?? []).reduce((s, i: any) => s + Number(i.amount), 0);
  const dailyYield = (investments ?? []).reduce(
    (s, i: any) => s + Number(i.amount) * Number(i.daily_rate),
    0,
  );
  const portfolio = balance + investedTotal;
  const name = profile?.display_name || user?.email?.split("@")[0] || "Trader";

  return (
    <div className="space-y-5 pb-6">
      {/* Greeting + portfolio */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-xl font-semibold truncate">{name}</h1>
        </div>
        <Link
          to="/profile"
          className="size-10 shrink-0 rounded-full bg-surface-elevated border border-border/60 grid place-items-center text-[12px] font-semibold uppercase hover:bg-surface transition"
          aria-label="Open profile"
        >
          {name.slice(0, 2).toUpperCase()}
        </Link>
      </header>

      {/* Portfolio hero */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-border/60 bg-surface/70 p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Portfolio value
          </div>
          <div className="text-[11px] text-muted-foreground num">USDT</div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="num text-[34px] font-bold tracking-tight leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ${fmtUSD(portfolio)}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Mini label="Available" value={`$${fmtUSD(balance)}`} icon={Wallet} />
          <Mini
            label="In plans"
            value={`$${fmtUSD(investedTotal)}`}
            sub={dailyYield > 0 ? `+$${fmtUSD(dailyYield)} / day` : undefined}
            icon={Coins}
            accent={dailyYield > 0}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link
            to="/profile"
            className="h-11 rounded-xl bg-gradient-gold text-primary-foreground text-[13px] font-semibold grid place-items-center shadow-gold-soft active:scale-[0.99] transition"
          >
            Deposit
          </Link>
          <Link
            to="/profile"
            className="h-11 rounded-xl border border-border/60 bg-surface text-foreground text-[13px] font-semibold grid place-items-center hover:bg-surface-elevated transition"
          >
            Withdraw
          </Link>
        </div>
      </motion.section>

      {/* Live gold market card */}
      <Link to="/market" className="block group">
        <section className="rounded-3xl border border-border/60 bg-surface/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold">XAU₮ / USDT</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/15 text-success text-[9px] font-bold tracking-wider">
                  <span className="size-1 rounded-full bg-success animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Tether Gold · Spot</div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`num text-lg font-bold leading-none ${
                  up ? "text-success" : "text-destructive"
                }`}
              >
                ${fmtUSD(price)}
              </div>
              <div
                className={`mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold num ${
                  up ? "text-success" : "text-destructive"
                }`}
              >
                {up ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />}
                {up ? "+" : "−"}${fmtUSD(Math.abs(change))} ({fmtPct(changePct)})
              </div>
            </div>
          </div>
          <div className="mt-3 h-20 -mx-1">
            <PriceChart data={chart} up={up} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Last 60 minutes</span>
            <span className="inline-flex items-center gap-1 text-foreground/80 group-hover:text-gold transition">
              Open chart <ArrowUpRight className="size-3" />
            </span>
          </div>
        </section>
      </Link>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2">
        <Quick to="/trade" icon={CandlestickChart} label="Trade" />
        <Quick to="/invest" icon={Coins} label="Invest" />
        <Quick to="/history" icon={HistoryIcon} label="History" />
        <Quick to="/referrals" icon={Gift} label="Refer" />
      </section>

      {/* Active investments summary */}
      {(investments?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border/60 bg-surface/60 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-gold" />
              <h2 className="text-sm font-semibold">Active plans</h2>
            </div>
            <Link to="/invest" className="text-[11px] text-gold hover:underline underline-offset-4">
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-border/40">
            {(investments ?? []).slice(0, 3).map((inv: any) => {
              const dailyAmt = Number(inv.amount) * Number(inv.daily_rate);
              return (
                <li key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold num">${fmtUSD(Number(inv.amount))}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Matures {new Date(inv.end_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] num font-semibold text-success">
                      +${fmtUSD(dailyAmt)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">per day</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Open positions */}
      {(openTrades?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border/60 bg-surface/60 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <h2 className="text-sm font-semibold">
                {openTrades!.length} open position{openTrades!.length > 1 ? "s" : ""}
              </h2>
            </div>
            <Link to="/trade" className="text-[11px] text-gold hover:underline underline-offset-4">
              View
            </Link>
          </div>
          <ul className="divide-y divide-border/40">
            {(openTrades ?? []).map((t: any) => {
              const isBuy = t.direction === "buy";
              return (
                <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isBuy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {isBuy ? <ArrowUp className="size-2.5" strokeWidth={3} /> : <ArrowDown className="size-2.5" strokeWidth={3} />}
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <span className="text-[12px] num font-medium">${fmtUSD(Number(t.amount))}</span>
                  </div>
                  <CountdownPill closesAt={t.closes_at} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Recent trades */}
      {(recentTrades?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border/60 bg-surface/60 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
            <h2 className="text-sm font-semibold">Recent trades</h2>
            <Link to="/history" className="text-[11px] text-gold hover:underline underline-offset-4">
              All
            </Link>
          </div>
          <ul className="divide-y divide-border/40">
            {(recentTrades ?? []).map((t: any) => {
              const win = t.result === "win";
              const pnl = Number(t.pnl ?? 0);
              return (
                <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium capitalize">
                      {t.direction} · ${fmtUSD(Number(t.amount))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.settled_at
                        ? new Date(t.settled_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>
                  </div>
                  <div
                    className={`text-[13px] num font-bold ${
                      win ? "text-success" : "text-destructive"
                    }`}
                  >
                    {win ? "+" : "−"}${fmtUSD(Math.abs(pnl))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Empty-state hint when truly fresh */}
      {!openTrades?.length && !recentTrades?.length && !investments?.length && balance < 1 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-surface/40 p-5 text-center">
          <div className="size-10 mx-auto rounded-full bg-gold/10 grid place-items-center mb-3">
            <ShieldCheck className="size-5 text-gold" />
          </div>
          <h3 className="text-sm font-semibold">Fund your account to begin</h3>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Deposit USDT to trade XAU₮ or start a gold-backed investment plan.
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-gold text-primary-foreground text-[13px] font-semibold shadow-gold-soft"
          >
            Make a deposit <ArrowUpRight className="size-4" />
          </Link>
        </section>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <Icon className="size-3" /> {label}
      </div>
      <div className="num text-base font-semibold mt-1 truncate">{value}</div>
      {sub && (
        <div className={`text-[10px] num mt-0.5 ${accent ? "text-success" : "text-muted-foreground"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Quick({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-surface/60 py-3 hover:bg-surface-elevated/60 active:scale-[0.97] transition"
    >
      <Icon className="size-[18px] text-foreground/85" />
      <span className="text-[11px] font-medium text-foreground/85">{label}</span>
    </Link>
  );
}

function CountdownPill({ closesAt }: { closesAt: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const end = new Date(closesAt).getTime();
  const remaining = Math.max(0, Math.ceil((end - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <span className="text-[11px] num font-semibold text-foreground tabular-nums">
      {mm}:{ss}
    </span>
  );
}
