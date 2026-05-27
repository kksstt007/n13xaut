import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — XAUT.trade" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { display_name: name },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // If a session was returned, the user is already logged in (email confirmation disabled)
    if (data.session) {
      toast.success("Welcome to XAUT.trade!");
      setLoading(false);
      nav({ to: "/dashboard" });
      return;
    }
    // Otherwise try to sign in immediately (in case confirmation is not required but no session returned)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (!signInError) {
      toast.success("Welcome to XAUT.trade!");
      nav({ to: "/dashboard" });
      return;
    }
    toast.success("Account created. Check your email to verify.");
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div>
            <h2 className="text-2xl font-display font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">Start trading XAU/USDT in seconds</p>
          </div>
          <div className="space-y-3">
            <input required placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition" />
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition" />
            <input required type="password" placeholder="Password (min 8 chars)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition" />
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
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
          <h1 className="mt-10 font-display text-5xl font-bold leading-tight">Join the next generation of <span className="text-gradient-gold">gold</span> traders.</h1>
        </div>
      </div>
    </div>
  );
}
