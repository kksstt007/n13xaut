import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ChevronDown, MessageCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — XAUT.trade" }] }),
  component: SupportPage,
});

const faqs = [
  { q: "How long do deposits take to credit?", a: "USDT deposits are credited after on-chain confirmation and a brief admin verification — typically within minutes during business hours." },
  { q: "Why was my withdrawal marked pending?", a: "Withdrawals are reviewed by our risk team before broadcast. You'll receive a status update as soon as it's processed." },
  { q: "What is the payout on a winning trade?", a: "Standard payout is +85% of your trade amount. Losses are capped at the amount risked." },
  { q: "How do I complete KYC verification?", a: "Open the menu, choose Identity (KYC), and upload a valid government ID along with a clear selfie." },
];


function SupportPage() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Help center</p>
        <h1 className="font-display text-2xl font-semibold mt-1">How can we help?</h1>
        <p className="text-sm text-muted-foreground mt-1">Real humans. Honest answers. Usually within minutes.</p>
      </div>

      <section className="rounded-2xl bg-surface border border-border/60">
        <button
          onClick={() => {
            const w = window as any;
            const tryOpen = () => {
              if (w.SMLivechat?.open) { w.SMLivechat.open(); return true; }
              if (w.salesmartly?.open) { w.salesmartly.open(); return true; }
              if (typeof w.openSalesmartly === "function") { w.openSalesmartly(); return true; }
              const widget = document.querySelector<HTMLElement>(
                "salesmartly-chat-widget, #salesmartly-container, [id^='salesmartly'], [class*='salesmartly'], [class*='sm-launcher'], [class*='sm-live']"
              );
              if (widget) {
                const btn = widget.shadowRoot?.querySelector<HTMLElement>("button, [role='button'], .launcher, .sm-launcher")
                  || widget.querySelector<HTMLElement>("button, [role='button']")
                  || widget;
                btn.click();
                return true;
              }
              return false;
            };
            if (!tryOpen()) {
              let tries = 0;
              const id = setInterval(() => {
                tries++;
                if (tryOpen() || tries > 20) clearInterval(id);
              }, 300);
            }
          }}
          className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-surface-elevated transition"
        >
          <div className="size-10 rounded-xl bg-gold/10 grid place-items-center">
            <MessageCircle className="size-[18px] text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Live chat</div>
            <div className="text-xs text-muted-foreground truncate">Available 24/7 · Avg reply under 6 min</div>
          </div>
          <span className="text-xs text-gold font-medium">Start chat</span>
        </button>
      </section>

      <section className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Frequently asked</h3>
          <ShieldCheck className="size-4 text-muted-foreground" />
        </div>
        <ul>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className={i > 0 ? "border-t border-border/40" : ""}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="px-5 pb-4 -mt-1 text-sm text-muted-foreground leading-relaxed">{f.a}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Average response time · <span className="text-foreground font-medium">under 6 min</span>
      </p>
    </div>
  );
}
