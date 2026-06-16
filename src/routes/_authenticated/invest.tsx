import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Coins, TrendingUp, Calendar, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

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
  termMin: number;
  termMax: number;
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
    termMin: 30,
    termMax: 30,
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
    termMin: 30,
    termMax: 30,
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
    termMin: 30,
    termMax: 45,
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
    termMin: 45,
    termMax: 45,
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
    termMin: 60,
    termMax: 60,
    perks: ["White-glove service", "Custom contracts", "Direct desk access"],
  },
];

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${n}`;

function rangeLabel(min: number, max: number | null) {
  if (max == null) return `${fmt(min)}+`;
  return `${fmt(min)} – ${fmt(max)}`;
}

function termLabel(a: number, b: number) {
  return a === b ? `${a} days` : `${a}–${b} days`;
}

function InvestPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Trust strip */}
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

      {/* Plan grid */}
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
                  <dd className="text-[13px] font-semibold mt-1">
                    {rangeLabel(p.min, p.max)}
                  </dd>
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
                  <dd className="text-[13px] font-semibold mt-1">
                    {termLabel(p.termMin, p.termMax)}
                  </dd>
                </div>
              </dl>

              <ul className="space-y-1.5">
                {p.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="size-1.5 rounded-full bg-gold/70" /> {perk}
                  </li>
                ))}
              </ul>

              <Link
                to="/wallet"
                className="mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gold text-background text-sm font-semibold hover:bg-gold/90 active:scale-[0.98] transition"
              >
                Invest Now <ArrowRight className="size-4" />
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Footnote */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Returns are indicative and depend on market conditions. Funds are allocated to
        XAUT-collateralised strategies. Withdraw principal at maturity; yields settle daily to
        your wallet balance.
      </p>
    </div>
  );
}
