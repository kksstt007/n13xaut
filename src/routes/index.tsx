import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Globe2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PriceChart } from "@/components/PriceChart";
import { usePriceFeed } from "@/lib/price-feed";
import { fmtUSD, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XAUT.trade — Trade Tether Gold (XAU/USDT) Like a Pro" },
      { name: "description", content: "Premium XAU/USDT trading: live charts, lightning execution, multi-network USDT deposits, and bank-grade security." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data, price, changePct } = usePriceFeed(80);
  const up = changePct >= 0;
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#markets" className="hover:text-foreground">Markets</a>
            <a href="#security" className="hover:text-foreground">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90 transition">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full glass-gold px-3 py-1 text-xs font-medium text-gold">
              <span className="size-1.5 rounded-full bg-gold animate-pulse-gold" />
              Live XAU/USDT markets
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Trade <span className="text-gradient-gold">gold</span>,<br /> on-chain speed.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              The institutional-grade platform for XAUT / USDT. Lightning execution, transparent fees, multi-network deposits, and a UX built for serious traders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3.5 font-semibold text-primary-foreground shadow-gold hover:opacity-90 transition">
                Start trading <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 font-medium hover:bg-surface-elevated transition">
                Demo dashboard
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[["$2.4B","24h volume"],["180+","Countries"],["0.05%","Maker fee"]].map(([v,l]) => (
                <div key={l}><div className="text-2xl font-display font-bold text-gradient-gold num">{v}</div><div className="text-xs text-muted-foreground mt-1">{l}</div></div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="relative">
            <div className="absolute -inset-4 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
            <div className="relative glass rounded-2xl p-6 shadow-elevated">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground">XAU/USDT · Tether Gold</div>
                  <div className="num text-4xl font-bold mt-1">${fmtUSD(price)}</div>
                  <div className={`num text-sm mt-1 ${up ? "text-success" : "text-destructive"}`}>{fmtPct(changePct)} · 24h</div>
                </div>
                <div className="flex gap-1">
                  {["1m","15m","1h","1D"].map((t,i) => (
                    <button key={t} className={`px-2.5 py-1 text-xs rounded-md ${i===2 ? "bg-surface-elevated text-foreground" : "text-muted-foreground"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="h-64"><PriceChart data={data} up={up} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="rounded-lg bg-success text-success-foreground py-2.5 font-semibold hover:opacity-90">Buy / Long</button>
                <button className="rounded-lg bg-destructive text-destructive-foreground py-2.5 font-semibold hover:opacity-90">Sell / Short</button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-4xl font-bold">Everything a serious trader needs</h2>
            <p className="mt-3 text-muted-foreground">A full exchange-grade stack tuned for one market: gold.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: Zap, t: "Sub-second execution", d: "Order matching with millisecond latency." },
              { i: BarChart3, t: "Pro-grade charts", d: "Live candlesticks, indicators, drawing tools." },
              { i: Globe2, t: "Multi-network USDT", d: "TRC20, ERC20, BEP20 deposits & withdrawals." },
              { i: ShieldCheck, t: "Bank-grade security", d: "2FA, KYC, encrypted vaults, audit logs." },
            ].map(({ i: Icon, t, d }) => (
              <motion.div key={t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="glass rounded-xl p-6 hover:border-gold/40 transition">
                <div className="size-10 rounded-lg glass-gold grid place-items-center mb-4"><Icon className="size-5 text-gold" /></div>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="border-t border-border/50 py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold">Ready to trade?</h2>
          <p className="mt-3 text-muted-foreground">Open an account in under 60 seconds.</p>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-8 py-4 font-semibold text-primary-foreground shadow-gold">
            Create your account <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} XAUT.trade · For demonstration purposes
      </footer>
    </div>
  );
}
