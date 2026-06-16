import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Ctx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};
const AuthCtx = React.createContext<Ctx>({
  user: null, session: null, loading: true, isAdmin: false, signOut: async () => {},
});

function readInitialSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const s: Session | null = parsed?.currentSession ?? parsed ?? null;
      if (s && s.access_token && s.user) {
        const exp = (s.expires_at ?? 0) * 1000;
        if (!exp || exp > Date.now()) return s as Session;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo(readInitialSession, []);
  const [session, setSession] = React.useState<Session | null>(initial);
  const [loading, setLoading] = React.useState(!initial);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          setIsAdmin(!!data?.some((r: any) => ["admin", "super_admin"].includes(r.role)));
          if (event === "SIGNED_IN") {
            const { logLogin } = await import("@/lib/audit");
            logLogin(true);
          }
        }, 0);
      } else setIsAdmin(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession((prev) => prev ?? data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  return (
    <AuthCtx.Provider value={{
      user: session?.user ?? null, session, loading, isAdmin,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>{children}</AuthCtx.Provider>
  );
}
export const useAuth = () => React.useContext(AuthCtx);
