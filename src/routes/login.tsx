import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { CountryStep, CountryChip } from "@/components/CountryStep";
import { DEFAULT_COUNTRY, phoneToSyntheticEmail, normalizePhone, type Country } from "@/lib/countries-list";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — XAUT.trade" }] }),
  component: LoginPage,
});

type Mode = "email" | "phone";

function LoginPage() {
  const nav = useNavigate();
  const [country, setCountry] = React.useState<Country>(DEFAULT_COUNTRY);
  const [step, setStep] = React.useState<"country" | "form">("country");
  const [mode, setMode] = React.useState<Mode>("email");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let loginEmail = "";
    if (mode === "email") {
      loginEmail = email.trim();
      if (!loginEmail) return toast.error("Enter your email");
    } else {
      const digits = normalizePhone(phone);
      if (digits.length < 6) return toast.error("Enter a valid phone number");
      loginEmail = phoneToSyntheticEmail(country.dial, digits);
    }
    if (!password) return toast.error("Enter your password");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      const msg = mode === "phone" && /invalid/i.test(error.message)
        ? "Invalid phone or password"
        : error.message;
      return toast.error(msg);
    }
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };

  if (step === "country") {
    return <CountryStep title="Sign in" country={country} onChange={setCountry} onContinue={() => setStep("form")} />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative items-center justify-center p-12 bg-gradient-to-br from-surface to-background overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-20 -right-20 size-96 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
        <div className="relative max-w-md">
          <Logo size={36} />
          <h1 className="mt-10 font-display text-5xl font-bold leading-tight">
            Welcome back to <span className="text-gradient-gold">premium</span> gold markets.
          </h1>
          <p className="mt-4 text-muted-foreground">Real-time XAU/USDT execution, all in one place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div>
            <h2 className="text-2xl font-display font-bold">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Access your trading account</p>
          </div>

          <CountryChip country={country} onChange={() => setStep("country")} />

          <ModeTabs mode={mode} onChange={setMode} />

          {mode === "email" ? (
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition"
            />
          ) : (
            <div className="flex rounded-lg bg-input border border-border overflow-hidden focus-within:border-gold focus-within:ring-2 focus-within:ring-ring transition">
              <span className="px-3 py-3 text-sm text-muted-foreground border-r border-border whitespace-nowrap">
                +{country.dial}
              </span>
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>
          )}

          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition"
          />

          <button
            disabled={loading}
            className="w-full rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            New here? <Link to="/signup" className="text-gold hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex gap-6 border-b border-border">
      {(["email", "phone"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "pb-2.5 text-sm font-medium transition relative -mb-px",
            mode === m
              ? "text-foreground border-b-2 border-gold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "email" ? "Email" : "Phone"}
        </button>
      ))}
    </div>
  );
}
