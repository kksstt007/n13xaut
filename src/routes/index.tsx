import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Lock, Layers, Coins, Globe2, LineChart, Smartphone,
  Wallet, Fingerprint, ChevronDown, CheckCircle2, BadgeCheck, TrendingUp,
  Zap, Eye, KeyRound, ServerCog, Mail, Twitter, Github, Send,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { PriceChart } from "@/components/PriceChart";
import { usePriceFeed } from "@/lib/price-feed";
import { fmtUSD, fmtPct } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XAUT.trade — Trade Tether Gold (XAU₮ / USDT)" },
      { name: "description", content: "Trade Tether Gold (XAU₮), the digital asset backed 1:1 by physical gold held in secure Swiss vaults. Institutional-grade custody, transparent reserves, mobile-first trading." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 md:h-16 flex items-center justify-between">
          <Logo size={26} />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#market" className="hover:text-foreground transition">Market</a>
            <a href="#about" className="hover:text-foreground transition">About XAU₮</a>
            <a href="#reserves" className="hover:text-foreground transition">Reserves</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/login"
              className="rounded-full border border-border/70 bg-surface/40 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-medium text-foreground/90 hover:text-foreground hover:border-gold/40 hover:bg-surface transition"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-gradient-gold px-3.5 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-semibold text-primary-foreground shadow-gold-soft hover:opacity-95 transition whitespace-nowrap"
            >
              Open account
            </Link>
          </div>
        </div>
      </header>

      <LandingContent />
    </div>
  );
}

function PrimaryCTA({
  className,
  children,
}: {
  className?: string;
  children?: (label: string) => React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const to = user ? "/trade" : "/signup";
  const label = user ? "Start Trading" : "Start Trading";
  return (
    <Link to={to} className={className} aria-disabled={loading}>
      {children ? children(label) : label}
    </Link>
  );
}

export function LandingContent() {
  const { data, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;
  return (
    <>
      <Hero data={data} price={price} changePct={changePct} up={up} />
      <MarketOverview price={price} changePct={changePct} up={up} />
      <About />
      <Benefits />
      <Reserves />
      <TradingExperience />
      <MobileShowcase />
      <Security />
      <TrustBadges />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero({ data, price, changePct, up }: any) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 grid-bg opacity-[0.22] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-32 right-1/2 translate-x-1/2 size-[520px] rounded-full bg-gradient-gold opacity-[0.12] blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-10 md:pt-20 pb-12 md:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full glass-gold px-3 py-1.5 text-[11px] font-medium tracking-wide text-gold uppercase">
            <BadgeCheck className="size-3.5" />
            1 XAU₮ = 1 troy oz · Allocated Swiss vault
          </div>

          <h1 className="mt-5 font-display text-[34px] sm:text-5xl lg:text-[58px] font-semibold leading-[1.05] tracking-tight">
            Digital Gold, <span className="text-gradient-gold">Backed by Real Physical Gold</span>.
          </h1>

          <p className="mt-5 text-[15px] sm:text-[17px] text-muted-foreground max-w-xl leading-relaxed">
            XAU₮ represents direct ownership of physical gold stored in secure Swiss vaults — combining
            the timeless stability of gold with the speed and transparency of public blockchains.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <PrimaryCTA className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:opacity-95 transition">
              {(label) => (<>{label} <ArrowRight className="size-4 group-hover:translate-x-0.5 transition" /></>)}
            </PrimaryCTA>
            <a href="#market" className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-6 py-3 text-sm font-medium hover:bg-surface-elevated transition">
              <LineChart className="size-4 text-gold" /> View Live Gold Price
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Allocated gold reserves", "On-chain transparency", "Multi-network USDT"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-gold" /> {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Ticker card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-gold opacity-10 blur-3xl rounded-full -z-10" />
          <div className="rounded-2xl border border-border/60 bg-surface/90 backdrop-blur-xl p-5 sm:p-6 shadow-elevated">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">XAU₮ / USDT · Live</div>
                <div className="num text-3xl sm:text-4xl font-semibold mt-1.5">${fmtUSD(price)}</div>
                <div className={`mt-1 num text-sm font-medium ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)} · last 80s</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success text-[11px] font-medium px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-success animate-pulse-gold" /> Live
              </span>
            </div>
            <div className="h-56 sm:h-64 mt-4 -mx-2"><PriceChart data={data} up={up} /></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {[
                ["Underlying", "Physical gold"],
                ["Custody", "Swiss vault"],
                ["Settlement", "On-chain"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-background/50 border border-border/40 px-3 py-2.5">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-0.5 font-medium text-foreground/90">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── MARKET OVERVIEW ───────────────────────── */

function MarketOverview({ price, changePct, up }: any) {
  const spot = price * 0.998;
  const marketCap = price * 246_000; // illustrative
  const volume = price * 18_400;     // illustrative

  const cards = [
    { label: "XAU₮ Price", value: `$${fmtUSD(price)}`, sub: `${fmtPct(changePct)} · 24h`, subClass: up ? "text-success" : "text-destructive", icon: Coins },
    { label: "Gold Spot Price", value: `$${fmtUSD(spot)}`, sub: "per troy ounce", icon: TrendingUp },
    { label: "24h Change", value: `${fmtPct(changePct)}`, sub: up ? "Trending up" : "Trending down", subClass: up ? "text-success" : "text-destructive", icon: LineChart },
    { label: "Market Cap", value: `$${(marketCap / 1_000_000).toFixed(1)}M`, sub: "Circulating XAU₮", icon: Layers },
    { label: "24h Volume", value: `$${(volume / 1_000).toFixed(1)}K`, sub: "Aggregated venues", icon: Zap },
  ];

  return (
    <section id="market" className="py-14 md:py-20 border-y border-border/50 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Live market overview</p>
            <h2 className="mt-2 font-display text-2xl md:text-3xl font-semibold tracking-tight">Real-time XAU₮ market data</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse" /> Updated every second · indicative reference
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background p-4 hover:border-gold/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{c.label}</span>
                <c.icon className="size-3.5 text-gold/70" />
              </div>
              <div className="num text-xl md:text-2xl font-semibold mt-2">{c.value}</div>
              <div className={`num text-[11px] mt-1 ${c.subClass ?? "text-muted-foreground"}`}>{c.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── ABOUT XAU₮ ───────────────────────── */

function About() {
  return (
    <section id="about" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8 grid lg:grid-cols-[0.95fr_1.05fr] gap-12 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">About Tether Gold</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            A digital token, backed one-to-one by physical gold.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
            Tether Gold (XAU₮) is a digital asset issued by TG Commodities Limited.
            Each token represents ownership of one troy ounce of allocated physical gold,
            stored in a professional Swiss vault and uniquely identifiable by serial number.
          </p>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            XAU₮ combines the long-standing role of gold as a store of value with the speed,
            transparency, and global accessibility of public blockchains — bringing the
            world's oldest reserve asset on-chain.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { i: Coins, t: "1 XAU₮ = 1 troy oz", d: "Each token represents a defined quantity of allocated physical gold." },
            { i: Lock, t: "Allocated custody", d: "Bars are held in a high-security Swiss vault and individually identified." },
            { i: Layers, t: "On-chain settlement", d: "Issued on Ethereum and TRON for transparent, near-instant transfers." },
            { i: ShieldCheck, t: "Hedge against inflation", d: "Gain exposure to a historically stable asset used to preserve purchasing power." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border/60 bg-surface p-5 hover:border-gold/40 transition">
              <div className="size-10 rounded-xl bg-gold/10 grid place-items-center mb-3">
                <c.i className="size-[18px] text-gold" />
              </div>
              <div className="font-semibold text-sm">{c.t}</div>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── BENEFITS ───────────────────────── */

function Benefits() {
  const items = [
    { i: Coins, t: "Physical Gold Backing", d: "Every token is backed by allocated physical gold stored under professional custody." },
    { i: ShieldCheck, t: "Blockchain Security", d: "Public blockchain settlement provides immutable transaction history and verifiable transfers." },
    { i: Zap, t: "Fast Global Transfers", d: "Move value across borders in minutes — without the friction of traditional bullion markets." },
    { i: TrendingUp, t: "Inflation Hedge", d: "Gain exposure to an asset historically used to preserve purchasing power across cycles." },
    { i: KeyRound, t: "Secure Ownership", d: "Self-directed custody options — withdraw to your own wallet at any time." },
    { i: Globe2, t: "High Liquidity", d: "Trade XAU₮ against USDT around the clock, with transparent pricing referenced to spot." },
  ];
  return (
    <section className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Why choose XAU₮</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            The stability of gold. The fluency of the internet.
          </h2>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((b, i) => (
            <motion.div
              key={b.t}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-2xl border border-border/60 bg-background p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="size-11 rounded-xl bg-gold/10 grid place-items-center mb-3 group-hover:bg-gold/15 transition">
                <b.i className="size-[19px] text-gold" />
              </div>
              <div className="font-semibold text-[15px]">{b.t}</div>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{b.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── RESERVES TRANSPARENCY ───────────────────────── */

function Reserves() {
  const stats = [
    { k: "Reserve backing", v: "100%", d: "Allocated gold per token", pct: 100 },
    { k: "Vault location", v: "Switzerland", d: "Tier-1 secure custody", pct: 96 },
    { k: "Networks", v: "ETH · TRON", d: "Multi-chain issuance", pct: 88 },
    { k: "Bar identification", v: "Serial-tracked", d: "Per-bar reference", pct: 100 },
  ];
  return (
    <section id="reserves" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Reserve transparency</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Every token, anchored to a real bar of gold.
            </h2>
            <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
              XAU₮ reserves are allocated rather than pooled — meaning each token corresponds to a defined
              quantity of gold from individually identified bars, with reserve details published by the issuer.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full glass-gold px-4 py-2 text-xs font-medium text-gold">
              <Eye className="size-3.5" /> Full reserve disclosures published by the issuer
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-xl p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-5">
              <div className="text-sm font-semibold">Reserve overview</div>
              <span className="text-[11px] text-muted-foreground">Indicative · refer to issuer disclosures</span>
            </div>
            <div className="space-y-5">
              {stats.map((s) => (
                <div key={s.k}>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.k}</div>
                      <div className="num font-semibold text-foreground/95 mt-0.5">{s.v}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.d}</div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden border border-border/40">
                    <motion.div
                      initial={{ width: 0 }} whileInView={{ width: `${s.pct}%` }} viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      className="h-full bg-gradient-gold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── TRADING EXPERIENCE ───────────────────────── */

function TradingExperience() {
  const items = [
    { i: Zap, t: "Fast execution", d: "Orders routed and confirmed in real time, with clear payout and risk." },
    { i: ShieldCheck, t: "Secure transactions", d: "Withdrawal reviews, audit logs, and rate-limited operations on every account." },
    { i: LineChart, t: "Real-time tracking", d: "Live XAU/USDT price feed with refined charts and cursor tooltips." },
    { i: Smartphone, t: "Mobile responsive", d: "Bottom navigation and thumb-zone controls for one-handed trading." },
    { i: ServerCog, t: "Professional interface", d: "Calm color system, tabular numerics, and zero unnecessary friction." },
    { i: Eye, t: "Transparent fees", d: "Clear payout formulas — no hidden spreads or surprise charges." },
  ];
  return (
    <section className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Trading experience</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Built for traders, designed for clarity.
          </h2>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((b) => (
            <div key={b.t} className="rounded-2xl border border-border/60 bg-background p-5 flex gap-4 hover:border-gold/40 transition">
              <div className="size-10 shrink-0 rounded-xl bg-gold/10 grid place-items-center">
                <b.i className="size-[18px] text-gold" />
              </div>
              <div>
                <div className="font-semibold text-[15px]">{b.t}</div>
                <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── MOBILE SHOWCASE ───────────────────────── */

function MobileShowcase() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1 flex justify-center">
          <PhoneMock />
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Designed for mobile</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            A trading desk that fits in your pocket.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
            Every screen is built for one-handed use — clear price action, a calm color system, and
            the controls you need exactly where your thumb expects them.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              { i: Smartphone, t: "Native-app feel", d: "Bottom navigation, generous tap targets, and instant transitions." },
              { i: LineChart, t: "Refined live charts", d: "Smooth area visualisation with elegant cursor and price tooltip." },
              { i: Fingerprint, t: "Biometric-ready auth", d: "Pair with platform passkeys for a secure, friction-free sign-in." },
            ].map((f) => (
              <li key={f.t} className="flex gap-3">
                <div className="size-9 shrink-0 rounded-xl bg-gold/10 grid place-items-center">
                  <f.i className="size-[16px] text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{f.t}</div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  const { data, price, changePct } = usePriceFeed(60);
  const up = changePct >= 0;
  return (
    <div className="relative w-[260px] sm:w-[280px]">
      <div className="absolute -inset-6 bg-gradient-gold opacity-[0.08] blur-3xl rounded-full -z-10" />
      <div className="rounded-[40px] border border-border/70 bg-background p-2 shadow-elevated">
        <div className="rounded-[34px] bg-surface overflow-hidden">
          <div className="h-6 flex items-center justify-center">
            <div className="h-1 w-12 rounded-full bg-border/70" />
          </div>
          <div className="px-4 pt-1 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Portfolio</span>
              <span className="text-[10px] text-gold font-medium">XAU₮</span>
            </div>
            <div>
              <div className="num text-2xl font-semibold">${fmtUSD(price * 4.2)}</div>
              <div className={`text-[11px] num mt-0.5 ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)} today</div>
            </div>
            <div className="h-28 -mx-2"><PriceChart data={data} up={up} /></div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="py-2 rounded-lg bg-success/15 text-success text-center text-[11px] font-semibold">Buy</div>
              <div className="py-2 rounded-lg bg-destructive/15 text-destructive text-center text-[11px] font-semibold">Sell</div>
            </div>
            <div className="rounded-xl border border-border/50 p-3 text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">XAU₮ / USDT</span>
              <span className="num font-medium">${fmtUSD(price)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── SECURITY ───────────────────────── */

function Security() {
  const points = [
    { i: Lock, t: "Allocated gold reserves", d: "Backed by physical gold held in a professional Swiss vault under custody arrangements." },
    { i: ShieldCheck, t: "Account protection", d: "Modern authentication, session monitoring, and rate-limited withdrawals on every account." },
    { i: BadgeCheck, t: "Compliance-first", d: "Identity verification (KYC) and transaction screening aligned with international standards." },
    { i: Fingerprint, t: "Operational controls", d: "Withdrawal reviews, audit logs, and principle-of-least-privilege admin access." },
  ];
  return (
    <section id="security" className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Security & trust</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Custody you can verify. Controls you can rely on.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            We treat the safekeeping of your funds and identity with the same discipline as a traditional financial institution.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-3">
          {points.map((p) => (
            <div key={p.t} className="rounded-2xl border border-border/60 bg-background p-5 flex gap-4">
              <div className="size-10 shrink-0 rounded-xl bg-gold/10 grid place-items-center">
                <p.i className="size-[18px] text-gold" />
              </div>
              <div>
                <div className="font-semibold text-[15px]">{p.t}</div>
                <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── TRUST BADGES ───────────────────────── */

function TrustBadges() {
  const items = [
    { i: Lock, t: "SSL Encryption" },
    { i: Wallet, t: "Secure Wallet Integration" },
    { i: KeyRound, t: "Encrypted Transactions" },
    { i: ShieldCheck, t: "Institutional Protection" },
  ];
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="rounded-3xl border border-border/60 glass p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((b) => (
            <div key={b.t} className="flex flex-col items-center text-center gap-2">
              <div className="size-12 rounded-2xl bg-gold/10 grid place-items-center">
                <b.i className="size-5 text-gold" />
              </div>
              <div className="text-[12.5px] font-medium text-foreground/90">{b.t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── HOW IT WORKS ───────────────────────── */

function HowItWorks() {
  const steps = [
    { n: "01", t: "Open account", d: "Sign up and complete identity verification to unlock trading and withdrawals." },
    { n: "02", t: "Fund with USDT", d: "Deposit USDT on TRC20, ERC20, or BEP20. Credited after on-chain confirmation." },
    { n: "03", t: "Trade XAU₮ / USDT", d: "Take a long or short position with transparent payout and clear risk." },
    { n: "04", t: "Withdraw any time", d: "Request a USDT withdrawal to your wallet — reviewed and processed by our team." },
  ];
  return (
    <section className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">How it works</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">A clear path from deposit to trade.</h2>
        </div>

        <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border/60 bg-background p-5"
            >
              <div className="text-xs font-mono text-gold tracking-widest">{s.n}</div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{s.d}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS = [
  { q: "What is XAU₮?", a: "Tether Gold (XAU₮) is a digital asset issued by TG Commodities Limited. Each token represents ownership of one troy ounce of allocated physical gold held in a Swiss vault." },
  { q: "How is the gold backed?", a: "Each token is backed 1:1 by allocated physical gold — individually identified bars stored under professional custody. The issuer publishes reserve information and serial-number references for verification." },
  { q: "Can users redeem gold?", a: "Redemption of physical gold is handled directly by the issuer, TG Commodities Limited, subject to its terms and minimum thresholds. This platform offers trading of XAU₮ against USDT." },
  { q: "Is XAU₮ secure?", a: "XAU₮ inherits the security properties of public blockchains, while reserves are held in a professional Swiss vault. On our platform, accounts use modern authentication, KYC, and withdrawal reviews." },
  { q: "How does trading work?", a: "Deposit USDT, choose XAU₮ / USDT, take a long or short position with a transparent payout formula, and manage open positions from your dashboard." },
  { q: "Is trading suitable for everyone?", a: "Trading involves risk and may not be suitable for every investor. Only commit funds you can afford to lose and seek independent advice if you are unsure." },
];

function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Frequently asked</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">Clear answers, not marketing.</h2>
        </div>
        <ul className="mt-10 rounded-2xl border border-border/60 bg-surface overflow-hidden">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className={i > 0 ? "border-t border-border/40" : ""}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-elevated/40 transition"
                >
                  <span className="text-[15px] font-medium">{f.q}</span>
                  <ChevronDown className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 -mt-1 text-[14px] text-muted-foreground leading-relaxed">{f.a}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA ───────────────────────── */

function CTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gold/25 p-8 md:p-14 text-center"
          style={{ background: "linear-gradient(160deg, oklch(0.20 0.02 86 / 0.45), oklch(0.13 0.006 260) 65%)" }}>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-gradient-gold opacity-[0.18] blur-3xl pointer-events-none" />
          <h2 className="relative font-display text-3xl md:text-4xl font-semibold tracking-tight">Own gold. The modern way.</h2>
          <p className="relative mt-3 text-[15px] text-muted-foreground max-w-xl mx-auto">
            Open an account in minutes and start trading XAU₮ / USDT with a platform designed for serious investors.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCTA className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold">
              {(label) => (<>{label === "Start Trading" ? "Create your account" : label} <ArrowRight className="size-4" /></>)}
            </PrimaryCTA>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-6 py-3 text-sm font-medium hover:bg-surface-elevated transition">
              I already have one
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="sm:col-span-2">
          <Logo size={26} />
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            A modern platform for trading Tether Gold (XAU₮) — combining the stability of physical gold
            with the transparency of public blockchains.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[
              { i: Twitter, l: "Twitter" },
              { i: Send, l: "Telegram" },
              { i: Github, l: "GitHub" },
              { i: Mail, l: "Email" },
            ].map((s) => (
              <a key={s.l} href="#" aria-label={s.l}
                className="size-9 rounded-full border border-border/60 bg-background grid place-items-center text-muted-foreground hover:text-gold hover:border-gold/40 transition">
                <s.i className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-foreground/90">Product</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="#market" className="hover:text-foreground">Market</a></li>
            <li><a href="#about" className="hover:text-foreground">About XAU₮</a></li>
            <li><a href="#reserves" className="hover:text-foreground">Reserves</a></li>
            <li><a href="#security" className="hover:text-foreground">Security</a></li>
            <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-foreground/90">Account</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/signup" className="hover:text-foreground">Open account</Link></li>
            <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-foreground/90">Legal</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
            <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground">Risk Disclosure</a></li>
            <li><a href="#" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 text-[11px] text-muted-foreground leading-relaxed">
          <p className="mb-2">
            <span className="text-foreground/80 font-semibold">Risk disclaimer:</span> Trading digital assets
            involves significant risk and may result in the loss of your capital. Past performance is not
            indicative of future results. Ensure you fully understand the risks involved and seek independent
            advice if necessary. This platform is not affiliated with the issuer of XAU₮.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border/30 mt-3">
            <p>© {new Date().getFullYear()} XAUT.trade — All rights reserved.</p>
            <p>XAU₮ is a trademark of TG Commodities Limited.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
