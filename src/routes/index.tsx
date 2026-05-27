import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Lock, Layers, Coins, Globe2, LineChart, Smartphone,
  Wallet, Fingerprint, ChevronDown, CheckCircle2, BadgeCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { PriceChart } from "@/components/PriceChart";
import { usePriceFeed } from "@/lib/price-feed";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XAUT.trade — Trade Tether Gold (XAU₮ / USDT)" },
      { name: "description", content: "A modern platform to trade Tether Gold (XAU₮), the digital asset backed 1:1 by physical gold. Transparent pricing, secure custody, and a refined mobile-first experience." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 md:h-16 flex items-center justify-between">
          <Logo size={26} />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition">About XAU₮</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link to="/signup" className="rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold-soft hover:opacity-95 transition">
              Open account
            </Link>
          </div>
        </div>
      </header>

      <Hero data={data} price={price} changePct={changePct} up={up} />
      <MarketStrip price={price} changePct={changePct} up={up} />
      <About />
      <HowItWorks />
      <Benefits />
      <MobileShowcase />
      <Security />
      <Portfolio />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero({ data, price, changePct, up }: any) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 grid-bg opacity-[0.25] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-32 right-1/2 translate-x-1/2 size-[420px] rounded-full bg-gradient-gold opacity-[0.10] blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-10 md:pt-20 pb-12 md:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full glass-gold px-3 py-1.5 text-[11px] font-medium tracking-wide text-gold uppercase">
            <BadgeCheck className="size-3.5" />
            Backed by physical gold · 1 XAU₮ = 1 troy ounce
          </div>

          <h1 className="mt-5 font-display text-[34px] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
            The modern way to own and trade <span className="text-gradient-gold">Tether Gold</span>.
          </h1>

          <p className="mt-5 text-[15px] sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            XAU₮ is a digital asset issued by TG Commodities Limited and backed 1:1 by allocated physical gold held in a Swiss vault.
            Trade XAU₮ against USDT on a refined, mobile-first platform built for serious investors.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/signup" className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold-soft hover:opacity-95 transition">
              Open an account <ArrowRight className="size-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <a href="#about" className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-6 py-3 text-sm font-medium hover:bg-surface-elevated transition">
              Learn about XAU₮
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

/* ───────────────────────── MARKET STRIP ───────────────────────── */

function MarketStrip({ price, changePct, up }: any) {
  const rows = [
    { sym: "XAU₮ / USDT", name: "Tether Gold", price, pct: changePct, hl: true },
    { sym: "BTC / USDT", name: "Bitcoin", price: 68420.55, pct: 1.42 },
    { sym: "ETH / USDT", name: "Ethereum", price: 3522.18, pct: -0.83 },
    { sym: "SOL / USDT", name: "Solana", price: 162.31, pct: 2.16 },
  ];
  return (
    <section className="border-y border-border/50 bg-surface/40">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 overflow-x-auto scrollbar-thin">
        <ul className="flex items-center gap-3 md:gap-6 min-w-max">
          {rows.map((r) => {
            const rup = r.pct >= 0;
            return (
              <li key={r.sym} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${r.hl ? "bg-gold/5 border border-gold/20" : ""}`}>
                <div>
                  <div className="text-[11px] text-muted-foreground">{r.name}</div>
                  <div className="text-xs font-semibold tracking-wide">{r.sym}</div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-medium">${fmtUSD(r.price)}</div>
                  <div className={`num text-[11px] ${rup ? "text-success" : "text-destructive"}`}>{fmtPct(r.pct)}</div>
                </div>
              </li>
            );
          })}
          <li className="text-[11px] text-muted-foreground pl-2">Indicative reference prices</li>
        </ul>
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
            Tether Gold (XAU₮) is a regulated digital asset issued by TG Commodities Limited.
            Each token represents ownership of one troy ounce of allocated physical gold,
            stored in a professional Swiss vault and uniquely identifiable by serial number.
          </p>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            XAU₮ combines the long-standing role of gold as a store of value with the speed,
            transparency, and global accessibility of public blockchains.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { i: Coins, t: "1 XAU₮ = 1 troy oz", d: "Each token is redeemable for a defined quantity of allocated physical gold." },
            { i: Lock, t: "Allocated custody", d: "Bars are held in a high-security Swiss vault and individually identified." },
            { i: Layers, t: "On-chain settlement", d: "Issued on Ethereum and TRON for transparent, near-instant transfers." },
            { i: ShieldCheck, t: "Audited reserves", d: "Reserves and serial numbers are disclosed by the issuer for verification." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border/60 bg-surface p-5">
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

/* ───────────────────────── HOW IT WORKS ───────────────────────── */

function HowItWorks() {
  const steps = [
    { n: "01", t: "Fund your account", d: "Deposit USDT on TRC20, ERC20, or BEP20. Funds are credited after on-chain confirmation." },
    { n: "02", t: "Trade XAU₮ / USDT", d: "Take a long or short position on Tether Gold with transparent payout and clear risk." },
    { n: "03", t: "Manage your portfolio", d: "Track open positions, history, and balances from a single, mobile-first dashboard." },
    { n: "04", t: "Withdraw any time", d: "Request a withdrawal in USDT to your wallet of choice — reviewed and processed by our team." },
  ];
  return (
    <section id="how" className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">How it works</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">A clear path from deposit to trade.</h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            Built around the workflow of a serious investor — predictable, transparent, and free of unnecessary friction.
          </p>
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

/* ───────────────────────── BENEFITS ───────────────────────── */

function Benefits() {
  const items = [
    { i: Coins, t: "Real-world asset exposure", d: "Gain exposure to gold — the world's most established store of value — through a digital wrapper." },
    { i: Globe2, t: "Global, 24/7 access", d: "Trade and transfer XAU₮ across borders without the constraints of traditional gold markets." },
    { i: LineChart, t: "Transparent pricing", d: "Live XAU/USDT pricing referenced to global spot markets, with clear payouts and fees." },
    { i: ShieldCheck, t: "Stability of gold", d: "Diversify into an asset historically used to hedge against inflation and market volatility." },
    { i: Layers, t: "Blockchain settlement", d: "Move value globally in minutes with the transparency and finality of public blockchains." },
    { i: Wallet, t: "Self-directed control", d: "Withdraw to your own non-custodial wallet at any time, subject to standard compliance checks." },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Why XAU₮</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            The stability of gold. The fluency of the internet.
          </h2>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((b) => (
            <div key={b.t} className="group rounded-2xl border border-border/60 bg-surface p-5 hover:border-gold/40 transition">
              <div className="size-10 rounded-xl bg-gold/10 grid place-items-center mb-3 group-hover:bg-gold/15 transition">
                <b.i className="size-[18px] text-gold" />
              </div>
              <div className="font-semibold text-[15px]">{b.t}</div>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{b.d}</p>
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
    <section className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
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
    <section id="security" className="py-16 md:py-24">
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
            <div key={p.t} className="rounded-2xl border border-border/60 bg-surface p-5 flex gap-4">
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

/* ───────────────────────── PORTFOLIO ───────────────────────── */

function Portfolio() {
  return (
    <section className="py-16 md:py-24 border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium">Portfolio management</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            One calm dashboard for your gold position.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
            Balances, open positions, deposit and withdrawal history, and identity status — organised
            into a single view that respects your attention.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-[13px]">
            {[
              "Real-time balance & P&L",
              "Open & closed trade history",
              "Multi-network USDT funding",
              "KYC and referral controls",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-foreground/90">
                <CheckCircle2 className="size-4 text-gold" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Total balance</div>
              <div className="num text-2xl sm:text-3xl font-semibold mt-1">$12,840.55</div>
            </div>
            <span className="text-xs text-success font-medium num">+1.84% · 24h</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            {[
              ["Available", "$8,420.10"],
              ["In positions", "$4,420.45"],
              ["XAU₮ exposure", "5.42 oz"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface border border-border/50 p-3">
                <div className="text-muted-foreground">{k}</div>
                <div className="num text-foreground/90 font-medium mt-0.5 text-[12.5px]">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border/50 divide-y divide-border/40">
            {[
              ["BUY · XAU₮", "+ $182.40", "success"],
              ["SELL · XAU₮", "− $46.10", "destructive"],
              ["Deposit · TRC20", "+ $1,000.00", "success"],
            ].map(([t, v, c]) => (
              <div key={t} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                <span className="text-foreground/90">{t}</span>
                <span className={`num font-medium ${c === "success" ? "text-success" : "text-destructive"}`}>{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground text-center">Illustrative preview · figures shown for design purposes</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS = [
  { q: "What is Tether Gold (XAU₮)?", a: "Tether Gold is a digital asset issued by TG Commodities Limited. Each XAU₮ token represents ownership of one troy ounce of allocated physical gold held in a Swiss vault." },
  { q: "How is XAU₮ backed?", a: "Each token is backed 1:1 by allocated physical gold — individually identified bars stored under professional custody. The issuer publishes reserve information and serial-number references for verification." },
  { q: "Why trade gold on-chain?", a: "On-chain settlement gives you the global accessibility, speed, and transparency of public blockchains while keeping exposure to gold — an asset historically used as a store of value." },
  { q: "What can I deposit and withdraw?", a: "The platform supports USDT on multiple networks (TRC20, ERC20, BEP20). All withdrawals are reviewed by our team before broadcast." },
  { q: "How is my account secured?", a: "Accounts use modern authentication, session monitoring, KYC checks, and operational controls including withdrawal reviews and audit logs." },
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
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
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
        <div className="relative overflow-hidden rounded-3xl border border-gold/25 p-8 md:p-12 text-center"
          style={{ background: "linear-gradient(160deg, oklch(0.20 0.02 86 / 0.45), oklch(0.13 0.006 260) 65%)" }}>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-gradient-gold opacity-[0.18] blur-3xl pointer-events-none" />
          <h2 className="relative font-display text-3xl md:text-4xl font-semibold tracking-tight">Own gold. The modern way.</h2>
          <p className="relative mt-3 text-[15px] text-muted-foreground max-w-xl mx-auto">
            Open an account in minutes and start trading XAU₮ / USDT with a platform designed for serious investors.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold-soft">
              Create your account <ArrowRight className="size-4" />
            </Link>
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
    <footer className="border-t border-border/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="sm:col-span-2">
          <Logo size={26} />
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            A modern platform for trading Tether Gold (XAU₮) — combining the stability of physical gold
            with the transparency of public blockchains.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-foreground/90">Product</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-foreground">About XAU₮</a></li>
            <li><a href="#how" className="hover:text-foreground">How it works</a></li>
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
      </div>
      <div className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>© {new Date().getFullYear()} XAUT.trade. Trading digital assets involves risk. Past performance is not indicative of future results.</p>
          <p>XAU₮ is a trademark of TG Commodities Limited. This site is not affiliated with the issuer.</p>
        </div>
      </div>
    </footer>
  );
}
