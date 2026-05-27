import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — XAUT.trade" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative items-center justify-center p-12 bg-gradient-to-br from-surface to-background overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-20 -right-20 size-96 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
        <div className="relative max-w-md">
          <Logo size={36} />
          <h1 className="mt-10 font-display text-5xl font-bold leading-tight">Welcome back to <span className="text-gradient-gold">premium</span> gold markets.</h1>
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
          <div className="space-y-3">
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition" />
            <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-ring transition" />
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
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
