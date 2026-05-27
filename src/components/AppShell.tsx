import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, TrendingUp, Wallet, History, ShieldCheck, Users, LogOut, Settings } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trade", label: "Trade", icon: TrendingUp },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/referrals", label: "Referrals", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="p-5 border-b border-sidebar-border"><Logo /></div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                <Icon className="size-4" /> {n.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mt-4 ${
              path.startsWith("/admin") ? "bg-destructive/20 text-destructive border border-destructive/30" : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}>
              <Settings className="size-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-sidebar-accent">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden sticky top-0 z-40 glass border-b border-border px-4 py-3 flex items-center justify-between">
          <Logo size={24} />
          <button onClick={signOut} className="text-xs text-muted-foreground">Sign out</button>
        </div>
        <div className="md:hidden flex overflow-x-auto scrollbar-thin gap-1 px-3 py-2 border-b border-border bg-sidebar">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                active ? "bg-gradient-gold text-primary-foreground" : "text-muted-foreground"
              }`}>
                <Icon className="size-3.5" />{n.label}
              </Link>
            );
          })}
          {isAdmin && <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-destructive">Admin</Link>}
        </div>
        <div className="p-4 md:p-8 max-w-[1500px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
