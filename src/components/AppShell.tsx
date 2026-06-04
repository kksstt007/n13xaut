import { Link, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import {
  Home, LineChart, CandlestickChart, LifeBuoy,
  Menu, LogOut, History, ShieldCheck, Users, Settings, User, X,

} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

const bottomNav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/trade", label: "Trade", icon: CandlestickChart, primary: true },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/profile", label: "Profile", icon: User },
];

const moreNav = [
  { to: "/history", label: "Trade history", icon: History },

  { to: "/kyc", label: "Identity (KYC)", icon: ShieldCheck },
  { to: "/referrals", label: "Referrals", icon: Users },
];

function isActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => { setMenuOpen(false); }, [path]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between"
          style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <Link to="/dashboard" className="flex items-center h-full py-1.5">
            <Logo height={36} />
          </Link>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated active:scale-95 transition"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-28 md:pb-32">{children}</div>
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="max-w-3xl mx-auto grid grid-cols-5 h-16">
          {bottomNav.map((n) => {
            const Icon = n.icon;
            const active = isActive(path, n.to);
            if (n.primary) {
              return (
                <li key={n.to} className="relative flex items-center justify-center">
                  <Link
                    to={n.to}
                    aria-label={n.label}
                    className="absolute -top-5 size-14 rounded-full bg-gradient-gold grid place-items-center shadow-gold-soft active:scale-95 transition"
                  >
                    <Icon className="size-6 text-primary-foreground" strokeWidth={2.2} />
                  </Link>
                  <span className={`absolute bottom-2 text-[10px] font-medium tracking-wide ${active ? "text-gold" : "text-muted-foreground"}`}>{n.label}</span>
                </li>
              );
            }
            return (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                >
                  <Icon
                    className={`size-[22px] ${active ? "text-gold" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                  <span className={`text-[10px] font-medium tracking-wide ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Slide-in menu (preserves access to all routes) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-surface border-l border-border shadow-elevated animate-slide-in-right flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-border/60">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signed in as</div>
                <div className="text-sm font-medium truncate">{user?.email}</div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {moreNav.map((n) => {
                const Icon = n.icon;
                const active = isActive(path, n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                      active ? "bg-gold/10 text-gold" : "text-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    <Icon className="size-[18px]" />
                    {n.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition mt-2 border ${
                    isActive(path, "/admin")
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "border-destructive/20 text-destructive hover:bg-destructive/10"
                  }`}
                >
                  <Settings className="size-[18px]" /> Admin panel
                </Link>
              )}
            </nav>
            <div className="p-4 border-t border-border/60"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-elevated hover:bg-secondary text-sm font-medium transition"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
