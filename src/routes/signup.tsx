import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { CountryStep, CountryChip } from "@/components/CountryStep";
import { DEFAULT_COUNTRY, phoneToSyntheticEmail, normalizePhone, type Country } from "@/lib/countries-list";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{"title": "Create account — XAUT.trade"}, {"name": "description", "content": "Create your XAUT.trade account to access gold trading and investment plans."}, {"property": "og:title", "content": "Create account — XAUT.trade"}, {"property": "og:description", "content": "Create your XAUT.trade account to access gold trading and investment plans."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary_large_image"}] }),
  component: SignupPage,
});

type Mode = "email" | "phone";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function SignupPage() {
  const nav = useNavigate();
  const [country, setCountry] = React.useState<Country>(DEFAULT_COUNTRY);
  const [step, setStep] = React.useState<"country" | "form">("country");
  const [mode, setMode] = React.useState<Mode>("email");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) return toast.error("You must accept the Terms and Conditions to continue");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");

    const displayName = username.trim();
    if (!USERNAME_RE.test(displayName))
      return toast.error("Username must be 3–20 characters: letters, numbers, or _ (no spaces)");

    let signupEmail = "";
    let phoneDigits: string | null = null;

    if (mode === "email") {
      signupEmail = email.trim();
      if (!signupEmail) return toast.error("Enter your email");
    } else {
      phoneDigits = normalizePhone(phone);
      if (phoneDigits.length < 6) return toast.error("Enter a valid phone number");
      signupEmail = phoneToSyntheticEmail(country.dial, phoneDigits);
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: {
          display_name: displayName,
          country_code: country.code,
          country_name: country.name,
          dial_code: country.dial,
          auth_method: mode,
          phone_number: phoneDigits ? `+${country.dial}${phoneDigits}` : null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: "2026-06-01",
        },
      },
    });

    if (error) {
      setLoading(false);
      const msg = mode === "phone" && /already/i.test(error.message)
        ? "This phone number is already registered"
        : error.message;
      return toast.error(msg);
    }

    if (data.session) {
      toast.success("Welcome to XAUT.trade!");
      setLoading(false);
      nav({ to: "/dashboard" });
      return;
    }

    // No session returned — try direct sign in (covers confirm-disabled flows)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signupEmail,
      password,
    });
    setLoading(false);
    if (!signInError) {
      toast.success("Welcome to XAUT.trade!");
      nav({ to: "/dashboard" });
      return;
    }
    if (mode === "email") {
      toast.success("Account created. Check your email to verify.");
    } else {
      toast.success("Account created. Please sign in.");
    }
    nav({ to: "/login" });
  };

  if (step === "country") {
    return <CountryStep title="Create account" country={country} onChange={setCountry} onContinue={() => setStep("form")} />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div>
            <h2 className="text-2xl font-display font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">Start trading XAU/USDT in seconds</p>
          </div>

          <CountryChip country={country} onChange={() => setStep("country")} />

          <ModeTabs mode={mode} onChange={setMode} />

          <div className="space-y-3">
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

            <div>
              <input
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                pattern="[a-zA-Z0-9_]{3,20}"
                className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition"
              />
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                3–20 chars · letters, numbers, _ · cannot be changed later
              </p>
            </div>

            <input
              required
              type="password"
              placeholder="Password (min 8 chars)"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border bg-input accent-gold cursor-pointer flex-shrink-0"
            />
            <span>
              I confirm that I am at least 18 years old and I have read and agree to the{" "}
              <Link to="/terms" target="_blank" className="text-gold hover:underline font-medium">
                Terms and Conditions
              </Link>
              , including the risk disclosure for trading Tether Gold (XAUT).
            </span>
          </label>

          <button
            disabled={loading || !acceptedTerms}
            className="w-full rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have one? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>

      <div className="hidden lg:flex relative items-center justify-center p-12 bg-gradient-to-bl from-surface to-background overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -bottom-20 -left-20 size-96 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
        <div className="relative max-w-md text-right">
          <Logo size={36} />
          <h1 className="mt-10 font-display text-5xl font-bold leading-tight">
            Join the next generation of <span className="text-gradient-gold">gold</span> traders.
          </h1>
        </div>
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
