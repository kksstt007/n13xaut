import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Loader2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
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
      { title: "Gold Investment Plans — XAUT.trade" },
      {
        name: "description",
        content:
          "Choose a XAUT-backed gold investment plan. Five tiers from Starter to Institutional with transparent daily yields and fixed terms.",
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
  highlight?: boolean;
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
    perks: ["Daily payouts", "Withdraw on maturity", "No lock-in fees"],
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
    highlight: true,
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

function rangeLabel(min: number, max: number | null) {
  if (max == null) return `${fmt(min)}+`;
  return `${fmt(min)} – ${fmt(max)}`;
}
function termLabel(d: number) {
  return `${d} days`;
}
function projectedDaily(plan: Plan, amount: number) {
  const max = plan.max ?? Math.max(plan.min * 4, amount || plan.min);
  const t = Math.min(1, Math.max(0, ((amount || plan.min) - plan.min) / Math.max(1, max - plan.min)));
  return plan.dailyMin + (plan.dailyMax - plan.dailyMin) * t;
}

function InvestPage() {
  const [selected, setSelected] = useState<Plan | null>(null);
  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-[11px] uppercase tracking-[0.18em]">
          <Sparkles className="size-3.5" /> Gold Investment
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Earn daily yield on XAUT-backed gold plans
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
          Choose a tier that matches your capital. Every plan is collateralised by tokenised
          gold (XAUT) with transparent daily returns and fixed maturity.
        </p>
      </motion.header>

      <WalletStrip />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: ShieldCheck, label: "Gold-backed", value: "1:1 XAUT" },
          { icon: TrendingUp, label: "Daily yield", value: "Up to 2.8%" },
          { icon: Calendar, label: "Terms", value: "30–60 days" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/60 bg-surface/60 px-3 py-3 sm:px-4 sm:py-4"
          >
            <s.icon className="size-4 text-gold mb-2" />
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="text-sm sm:text-base font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Investment Levels</h2>
          <span className="text-xs text-muted-foreground">5 tiers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((p, i) => (
            <motion.article
              key={p.level}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={`relative rounded-2xl border bg-surface/70 p-5 flex flex-col gap-4 transition hover:border-gold/40 hover:-translate-y-0.5 ${
                p.highlight ? "border-gold/50" : "border-border/60"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-gold text-[10px] font-semibold uppercase tracking-wider text-background">
                  Popular
                </span>
              )}

              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Level {p.level}
                  </div>
                  <h3 className="text-xl font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
                </div>
                <div className="size-10 shrink-0 grid place-items-center rounded-xl bg-gold/10 border border-gold/20">
                  <Coins className="size-5 text-gold" />
                </div>
              </header>

              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-background/60 border border-border/50 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Investment
                  </dt>
                  <dd className="text-[13px] font-semibold mt-1">{rangeLabel(p.min, p.max)}</dd>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/50 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Daily
                  </dt>
                  <dd className="text-[13px] font-semibold mt-1 text-gold">
                    {p.dailyMin.toFixed(1)}–{p.dailyMax.toFixed(1)}%
                  </dd>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/50 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Term
                  </dt>
                  <dd className="text-[13px] font-semibold mt-1">{termLabel(p.termDays)}</dd>
                </div>
              </dl>

              <ul className="space-y-1.5">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-gold/70" /> {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelected(p)}
                className="mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gold text-background text-sm font-semibold hover:bg-gold/90 active:scale-[0.98] transition"
              >
                Invest Now <ArrowRight className="size-4" />
              </button>
            </motion.article>
          ))}
        </div>
      </section>

      <ActiveInvestments />

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Returns are indicative and depend on market conditions. Funds are allocated to
        XAUT-collateralised strategies. Withdraw principal at maturity; yields settle daily to
        your wallet balance.
      </p>

      <InvestDialog plan={selected} onClose={() => setSelected(null)} />
    </div>
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

function WalletStrip() {
  const { data: balance, isLoading } = useWallet();
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="size-9 grid place-items-center rounded-xl bg-gold/10 border border-gold/20">
          <Wallet className="size-4 text-gold" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Available balance
          </div>
          <div className="text-base font-semibold">
            {isLoading ? "—" : fmtUsd(balance ?? 0)}
          </div>
        </div>
      </div>
      <a
        href="/wallet"
        className="text-xs text-gold hover:underline underline-offset-4"
      >
        Manage
      </a>
    </div>
  );
}

function InvestDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const { data: balance } = useWallet();
  const qc = useQueryClient();
  const fn = useServerFn(createInvestment);

  const value = Number(amount);
  const valid =
    plan != null &&
    value >= plan.min &&
    (plan.max == null || value <= plan.max) &&
    value <= (balance ?? 0);

  const dailyPct = plan ? projectedDaily(plan, value || plan.min) : 0;
  const dailyEarn = plan ? (value * dailyPct) / 100 : 0;
  const totalEarn = plan ? dailyEarn * plan.termDays : 0;
  const endDate = useMemo(() => {
    if (!plan) return null;
    return new Date(Date.now() + plan.termDays * 86400_000);
  }, [plan]);

  const m = useMutation({
    mutationFn: async () => fn({ data: { level: plan!.level, amount: value } }),
    onSuccess: (res) => {
      toast.success(`Invested ${fmtUsd(value)} in ${plan!.name}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
      setAmount("");
      onClose();
      void res;
    },
    onError: (e: Error) => toast.error(e.message || "Investment failed"),
  });

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {plan && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="size-5 text-gold" /> Invest in {plan.name}
              </DialogTitle>
              <DialogDescription>
                Range {rangeLabel(plan.min, plan.max)} · {termLabel(plan.termDays)} · daily{" "}
                {plan.dailyMin.toFixed(1)}–{plan.dailyMax.toFixed(1)}%
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Amount (USDT)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={`Min ${fmt(plan.min)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 mt-1 text-base"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Balance: {fmtUsd(balance ?? 0)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cap = plan.max ?? balance ?? 0;
                      setAmount(String(Math.min(balance ?? 0, cap)));
                    }}
                    className="text-gold hover:underline underline-offset-4"
                  >
                    Use max
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
                <Stat label="Daily" value={`${dailyPct.toFixed(2)}%`} accent />
                <Stat label="Daily yield" value={fmtUsd(dailyEarn || 0)} />
                <Stat label="Total yield" value={fmtUsd(totalEarn || 0)} />
              </div>

              <div className="text-[11px] text-muted-foreground">
                Matures on{" "}
                <span className="text-foreground font-medium">
                  {endDate?.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                . Principal returns automatically at maturity.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} disabled={m.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => m.mutate()}
                disabled={!valid || m.isPending}
                className="bg-gold text-background hover:bg-gold/90"
              >
                {m.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  `Confirm · ${fmtUsd(value || 0)}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-1 ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
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
      <h2 className="text-lg font-semibold">Your Investments</h2>
      <div className="space-y-3">
        {items.map((inv) => {
          const now = Date.now();
          const end = new Date(inv.end_at).getTime();
          const start = new Date(inv.start_at).getTime();
          const last = new Date(inv.last_payout_at).getTime();
          const cap = Math.min(now, end);
          const accruedDays = Math.max(0, (cap - last) / 86400_000);
          const accrued = Number(inv.amount) * Number(inv.daily_rate) * accruedDays;
          const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
          const matured = now >= end;
          const completed = inv.status === "completed";
          return (
            <div
              key={inv.id}
              className="rounded-2xl border border-border/60 bg-surface/60 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Level {inv.level} · {inv.plan_name}
                  </div>
                  <div className="text-base font-semibold mt-0.5">{fmtUsd(Number(inv.amount))}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {(Number(inv.daily_rate) * 100).toFixed(2)}% daily · ends{" "}
                    {new Date(inv.end_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Paid
                  </div>
                  <div className="text-sm font-semibold text-gold">
                    {fmtUsd(Number(inv.total_paid))}
                  </div>
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-muted-foreground">
                  {completed
                    ? "Completed"
                    : matured
                      ? "Matured · claim principal"
                      : `Accrued ${fmtUsd(accrued)}`}
                </div>
                <Button
                  size="sm"
                  variant={matured ? "default" : "outline"}
                  onClick={() => m.mutate(inv.id)}
                  disabled={m.isPending || completed || (!matured && accrued < 0.01)}
                  className={matured ? "bg-gold text-background hover:bg-gold/90" : ""}
                >
                  {m.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : matured ? (
                    "Claim & close"
                  ) : (
                    "Claim yield"
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
