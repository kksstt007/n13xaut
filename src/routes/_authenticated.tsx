import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);
  if (!user) {
    if (loading) {
      return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
    }
    return null;
  }
  return <AppShell><Outlet /></AppShell>;
}
