import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Wallet,
  Clock,
  Info,
  CheckCircle2,
  Sparkles,
  Flame,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  createInvestment,
  listInvestments,
  claimYield,
} from "@/lib/invest.functions";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({
    meta: [
      { title: "Earn — Gold Investment Plans | XAUT.trade" },
      {
        name: "description",
        content:
          "Earn daily yield on XAUT-backed gold plans. Five tiers from Starter to Institutional with transparent APR, locked terms, and same-day payouts.",
      },
    ],
  }),
  component: InvestPage,
});

type Plan = {
  level: number;
  name: string;
  tagline: string;
  min: number;
  max: number | null;
  dailyMin: number;
  dailyMax: number;
  termDays: number;
  badge?: "popular" | "hot" | "new";
  perks: string[];
};

const plans: Plan[] = [
  {
    level: 1,
    name: "Starter",
    tagline: "Begin your gold journey",
    min: 50,
    max: 200,
    dailyMin: 1.0,
    dailyMax: 1.2,
    termDays: 30,
    badge: "new",
    perks: ["Daily payouts", "Principal returned at maturity", "No setup fee"],
  },
  {
    level: 2,
    name: "Standard",
    tagline: "Steady, balanced growth",
    min: 200,
    max: 1000,
    dailyMin: 1.2,
    dailyMax: 1.5,
    termDays: 30,
    perks: ["Daily payouts", "Priority support", "Auto-compound option"],
  },
  {
    level: 3,
    name: "Advanced",
    tagline: "Stronger yield, flexible term",
    min: 1000,
    max: 5000,
    dailyMin: 1.5,
    dailyMax: 1.8,
    termDays: 45,
    badge: "popular",
    perks: ["Daily payouts", "Dedicated advisor", "Quarterly review"],
  },
  {
    level: 4,
    name: "VIP",
    tagline: "Premium tier for serious investors",
    min: 5000,
    max: 20000,
    dailyMin: 1.8,
    dailyMax: 2.2,
    termDays: 45,
    badge: "hot",
    perks: ["Daily payouts", "VIP onboarding", "Reduced withdrawal fees"],
  },
  {
    level: 5,
    name: "Institutional",
    tagline: "Bespoke terms for capital partners",
    min: 20000,
    max: null,
    dailyMin: 2.2,
    dailyMax: 2.8,
    termDays: 60,
    perks: ["White-glove service", "Custom contracts", "Direct desk access"],
  },
];

const fmt = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
    : `$${n}`;
const fmtUsd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

function rangeLabel(min: number, max: number | null) {
  if (max == null) return `${fmt(min)}+`;
  return `${fmt(min)} – ${fmt(max)}`;
}
function projectedDaily(plan: Plan, amount: number) {
  const max = plan.max ?? Math.max(plan.min * 4, amount || plan.min);
  const t = Math.min(1, Math.max(0, ((amount || plan.min) - plan.min) / Math.max(1, max - plan.min)));
  return plan.dailyMin + (plan.dailyMax - plan.dailyMin) * t;
}
function aprFromDaily(dailyPct: number) {
  return dailyPct * 365;
}

type Tab = "all" | "flexible" | "high";

function InvestPage() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "flexible") return plans.filter((p) => p.termDays <= 30);
    if (tab === "high") return plans.filter((p) => p.dailyMax >= 1.8);
    return plans;
  }, [tab]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated px-5 py-6 sm:px-7 sm:py-8"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold/90">
          <Sparkles className="size-3.5" /> Gold Earn
        </div>
        <h1 className="mt-3 text-[26px] sm:text-[34px] leading-tight font-semibold tracking-tight">
          Put your USDT to work in <span className="text-gold">XAUT-backed</span> gold plans
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pick a tier, lock for a fixed term, and earn transparent daily yield. Principal returns automatically at maturity.
        </p>

        <PortfolioSummary />
      </motion.section>

      {/* Trust strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: ShieldCheck, label: "Collateral", value: "1:1 XAUT" },
          { icon: TrendingUp, label: "Max APR", value: `${(2.8 * 365).toFixed(0)}%` },
          { icon: Calendar, label: "Terms", value: "30 – 60 d" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/60 bg-surface/60 px-3 py-3"
          >
            <s.icon className="size-4 text-gold mb-1.5" />
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </div>
            <div className="text-sm sm:text-base font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Plans header + tabs */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Investment Plans</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} of {plans.length} plans · Locked terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-surface/60 p-1 w-fit">
          {([
            ["all", "All plans"],
            ["flexible", "Short term"],
            ["high", "High yield"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition ${
                tab === k
                  ? "bg-gold text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((p, i) => (
            <PlanCard key={p.level} p={p} i={i} onPick={() => setSelected(p)} />
          ))}
        </div>
      </section>

      <ActiveInvestments />

      <FAQ />

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Returns are indicative and depend on market conditions. Funds are allocated to
        XAUT-collateralised strategies. Yields settle once every 24 hours to your wallet balance.
        Principal is returned automatically at maturity.
      </p>

      <InvestDialog plan={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PlanCard({ p, i, onPick }: { p: Plan; i: number; onPick: () => void }) {
  const apr = aprFromDaily((p.dailyMin + p.dailyMax) / 2);
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.04 }}
      className={`group relative overflow-hidden rounded-2xl border bg-surface/70 p-4 sm:p-5 flex flex-col gap-4 transition hover:border-gold/50 ${
        p.badge === "popular" ? "border-gold/40" : "border-border/60"
      }`}
    >
      {p.badge && (
        <span
          className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 h-5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
            p.badge === "popular"
              ? "bg-gold text-background"
              : p.badge === "hot"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {p.badge === "hot" && <Flame className="size-3" />}
          {p.badge}
        </span>
      )}

      <header className="flex items-start gap-3">
        <div className="size-11 shrink-0 grid place-items-center rounded-xl bg-gold/10 border border-gold/20">
          <Coins className="size-5 text-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Level {p.level}
          </div>
          <h3 className="text-base sm:text-lg font-semibold truncate">{p.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.tagline}</p>
        </div>
      </header>

      {/* APR big number — Binance style */}
      <div className="flex items-end justify-between gap-3 rounded-xl border border-gold/15 bg-gold/[0.04] px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Est. APR
          </div>
          <div className="text-[28px] sm:text-[32px] leading-none font-bold tabular-nums text-gold mt-1">
            {apr.toFixed(0)}
            <span className="text-base font-semibold align-top ml-0.5">%</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Daily
          </div>
          <div className="text-sm font-semibold tabular-nums mt-1">
            {p.dailyMin.toFixed(2)} – {p.dailyMax.toFixed(2)}%
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-background/40 border border-border/50 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Min – Max
          </dt>
          <dd className="text-[13px] font-semibold mt-0.5 tabular-nums">
            {rangeLabel(p.min, p.max)}
          </dd>
        </div>
        <div className="rounded-lg bg-background/40 border border-border/50 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Lock period
          </dt>
          <dd className="text-[13px] font-semibold mt-0.5 tabular-nums">
            {p.termDays} days
          </dd>
        </div>
      </dl>

      <ul className="space-y-1">
        {p.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-gold/80 shrink-0" /> {perk}
          </li>
        ))}
      </ul>

      <button
        onClick={onPick}
        className="mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gold text-background text-sm font-semibold hover:brightness-105 active:scale-[0.99] transition"
      >
        Subscribe <ArrowRight className="size-4" />
      </button>
    </motion.article>
  );
}

function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("usdt_balance")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return Number(data.usdt_balance);
    },
  });
}

function PortfolioSummary() {
  const { data: balance, isLoading: bLoading } = useWallet();
  const list = useServerFn(listInvestments);
  const { user } = useAuth();
  const { data: invs } = useQuery({
    queryKey: ["investments", user?.id],
    enabled: !!user?.id,
    queryFn: () => list({}),
  });

  const totals = useMemo(() => {
    const items = invs ?? [];
    const active = items.filter((i) => i.status === "active");
    const invested = active.reduce((s, i) => s + Number(i.amount), 0);
    const earned = items.reduce((s, i) => s + Number(i.total_paid), 0);
    return { invested, earned, active: active.length };
  }, [invs]);

  return (
    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <SummaryCell
        label="Available"
        value={bLoading ? "—" : fmtUsd(balance ?? 0)}
        cta={
          <Link to="/wallet" className="text-[11px] text-gold hover:underline underline-offset-4">
            Deposit
          </Link>
        }
        icon={<Wallet className="size-3.5 text-gold" />}
      />
      <SummaryCell
        label="Invested"
        value={fmtUsd(totals.invested)}
        icon={<Coins className="size-3.5 text-gold" />}
      />
      <SummaryCell
        label="Total earned"
        value={fmtUsd(totals.earned)}
        accent
        icon={<TrendingUp className="size-3.5 text-emerald-400" />}
      />
      <SummaryCell
        label="Active plans"
        value={totals.active.toString()}
        icon={<Sparkles className="size-3.5 text-gold" />}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  cta,
  icon,
  accent,
}: {
  label: string;
  value: string;
  cta?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/30 backdrop-blur-sm px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {icon}
          {label}
        </div>
        {cta}
      </div>
      <div
        className={`mt-1.5 text-base sm:text-[17px] font-semibold tabular-nums ${
          accent ? "text-emerald-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function InvestDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const { data: balance } = useWallet();
  const qc = useQueryClient();
  const fn = useServerFn(createInvestment);

  const value = Number(amount) || 0;
  const tooLow = plan ? value > 0 && value < plan.min : false;
  const tooHigh = plan && plan.max != null ? value > plan.max : false;
  const exceedsBal = value > (balance ?? 0);
  const valid =
    plan != null && value >= (plan?.min ?? 0) && !tooHigh && !exceedsBal && agree;

  const dailyPct = plan ? projectedDaily(plan, value || plan.min) : 0;
  const dailyEarn = plan ? (value * dailyPct) / 100 : 0;
  const totalEarn = plan ? dailyEarn * plan.termDays : 0;
  const apr = aprFromDaily(dailyPct);
  const endDate = useMemo(() => {
    if (!plan) return null;
    return new Date(Date.now() + plan.termDays * 86400_000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.level, plan?.termDays]);

  const m = useMutation({
    mutationFn: async () => fn({ data: { level: plan!.level, amount: value } }),
    onSuccess: () => {
      toast.success(`Subscribed ${fmtUsd(value)} to ${plan!.name}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
      setAmount("");
      setAgree(false);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Subscription failed"),
  });

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {plan && (
          <>
            <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-gradient-to-b from-gold/[0.06] to-transparent">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <div className="size-8 grid place-items-center rounded-lg bg-gradient-gold">
                    <Coins className="size-4 text-background" />
                  </div>
                  Subscribe · {plan.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] mt-1">
                  Range {rangeLabel(plan.min, plan.max)} · {plan.termDays}-day lock · Est. APR{" "}
                  <span className="text-gold font-semibold tabular-nums">{apr.toFixed(0)}%</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <span className="text-[11px] text-muted-foreground">
                    Available: <span className="tabular-nums text-foreground">{fmtUsd(balance ?? 0)}</span>
                  </span>
                </div>
                <div className="mt-1.5 relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Min ${fmt(plan.min)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 pr-24 text-base tabular-nums"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">USDT</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cap = plan.max ?? balance ?? 0;
                        setAmount(String(Math.min(balance ?? 0, cap)));
                      }}
                      className="h-7 px-2 rounded-md bg-gold/10 text-gold text-[11px] font-semibold hover:bg-gold/15"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Quick chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[plan.min, Math.min(plan.max ?? plan.min * 5, plan.min * 2), Math.min(plan.max ?? plan.min * 10, plan.min * 5)]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(String(v))}
                        className="h-7 px-2.5 rounded-md border border-border/60 bg-background/40 text-[11px] text-muted-foreground hover:text-foreground hover:border-gold/40"
                      >
                        {fmt(v)}
                      </button>
                    ))}
                </div>

                {(tooLow || tooHigh || exceedsBal) && (
                  <div className="mt-2 text-[11px] text-rose-400">
                    {exceedsBal
                      ? "Amount exceeds your available balance."
                      : tooLow
                        ? `Minimum subscription is ${fmt(plan.min)}.`
                        : `Maximum for this tier is ${fmt(plan.max!)}.`}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border/60 bg-background/40 divide-y divide-border/60">
                <SummaryRow label="Est. daily rate" value={`${fmtNum(dailyPct)}%`} accent />
                <SummaryRow label="Est. daily earnings" value={fmtUsd(dailyEarn)} />
                <SummaryRow label="Est. total earnings" value={fmtUsd(totalEarn)} highlight />
                <SummaryRow
                  label="Maturity date"
                  value={
                    endDate?.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }) ?? "—"
                  }
                />
              </div>

              <label className="flex items-start gap-2 text-[11.5px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 accent-[color:var(--gold)]"
                />
                <span>
                  I understand that funds are locked for {plan.termDays} days. Yields settle
                  once per 24 hours and principal is returned at maturity.
                </span>
              </label>
            </div>

            <DialogFooter className="px-5 py-4 border-t border-border/60 bg-surface/40 gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose} disabled={m.isPending} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                onClick={() => m.mutate()}
                disabled={!valid || m.isPending}
                className="flex-1 bg-gold text-background hover:brightness-105 font-semibold"
              >
                {m.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Confirm · {fmtUsd(value)}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span
        className={`text-[13px] font-semibold tabular-nums ${
          accent ? "text-gold" : highlight ? "text-emerald-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

function fmtDuration(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function ActiveInvestments() {
  const list = useServerFn(listInvestments);
  const claim = useServerFn(claimYield);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["investments", user?.id],
    enabled: !!user?.id,
    queryFn: () => list({}),
    refetchInterval: 30_000,
  });
  const now = useNow(1000);

  const m = useMutation({
    mutationFn: async (id: string) => claim({ data: { id } }),
    onSuccess: (res) => {
      if (res.matured) toast.success(`Matured · ${fmtUsd(res.credited)} credited`);
      else toast.success(`Claimed ${fmtUsd(res.credited)}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
    },
    onError: (e: Error) => toast.error(e.message || "Claim failed"),
  });

  if (isLoading) return null;
  const items = data ?? [];
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold tracking-tight">My Subscriptions</h2>
        <Link to="/history" className="text-xs text-muted-foreground hover:text-gold">
          View history →
        </Link>
      </div>

      <div className="space-y-2.5">
        {items.map((inv) => {
          const end = new Date(inv.end_at).getTime();
          const start = new Date(inv.start_at).getTime();
          const last = new Date(inv.last_payout_at).getTime();
          const cap = Math.min(now, end);
          const accruedDays = Math.max(0, (cap - last) / 86400_000);
          const accrued = Number(inv.amount) * Number(inv.daily_rate) * accruedDays;
          const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
          const matured = now >= end;
          const completed = inv.status === "completed";
          const nextPayoutAt = last + 86400_000;
          const untilNext = nextPayoutAt - now;
          const dailyAmt = Number(inv.amount) * Number(inv.daily_rate);
          const canClaim = !completed && (matured || untilNext <= 0);

          return (
            <div
              key={inv.id}
              className="rounded-2xl border border-border/60 bg-surface/60 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 grid place-items-center rounded-xl bg-gold/10 border border-gold/20 shrink-0">
                    <Coins className="size-4 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{inv.plan_name}</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 h-4 grid place-items-center rounded bg-gold/10 text-gold border border-gold/20">
                        L{inv.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {(Number(inv.daily_rate) * 100).toFixed(2)}% / day · ends{" "}
                      {new Date(inv.end_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Principal
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {fmtUsd(Number(inv.amount))}
                  </div>
                </div>
              </div>

              {/* progress */}
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  <span>Progress</span>
                  <span className="tabular-nums text-foreground">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-gold transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* stats */}
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Total paid" value={fmtUsd(Number(inv.total_paid))} accent />
                <MiniStat
                  label="Daily payout"
                  value={fmtUsd(dailyAmt)}
                />
                <MiniStat
                  label={matured ? "Status" : "Next payout"}
                  value={
                    completed
                      ? "Closed"
                      : matured
                        ? "Ready"
                        : fmtDuration(untilNext)
                  }
                  icon={!completed && !matured ? <Clock className="size-3" /> : undefined}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-muted-foreground">
                  {completed
                    ? "Subscription closed"
                    : matured
                      ? "Matured · claim principal + remaining yield"
                      : canClaim
                        ? `Ready to claim ~${fmtUsd(accrued)}`
                        : "Yields unlock every 24 hours"}
                </div>
                <Button
                  size="sm"
                  onClick={() => m.mutate(inv.id)}
                  disabled={m.isPending || completed || !canClaim}
                  className={
                    matured
                      ? "bg-gold text-background hover:brightness-105"
                      : "bg-gold/90 text-background hover:brightness-105 disabled:bg-muted disabled:text-muted-foreground"
                  }
                >
                  {m.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : matured ? (
                    "Claim & close"
                  ) : (
                    "Claim"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/50 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`text-[13px] font-semibold tabular-nums mt-0.5 ${
          accent ? "text-gold" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function FAQ() {
  const items = [
    {
      q: "How is the daily yield calculated?",
      a: "Each plan has a daily-rate band. Your locked-in rate scales linearly inside the band based on the subscription amount within the tier.",
    },
    {
      q: "When are yields paid out?",
      a: "Yields unlock once every 24 hours from your subscription time. Tap Claim to credit them to your wallet balance.",
    },
    {
      q: "Can I withdraw early?",
      a: "Principal is locked for the full term and returns automatically at maturity together with any unclaimed yield.",
    },
  ];
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Info className="size-4 text-gold" /> Frequently asked
      </h2>
      <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-surface/40">
        {items.map((it) => (
          <details key={it.q} className="group px-4 py-3">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="text-sm font-medium">{it.q}</span>
              <span className="text-gold text-lg leading-none group-open:rotate-45 transition">
                +
              </span>
            </summary>
            <p className="mt-2 text-[12.5px] text-muted-foreground leading-relaxed">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
