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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
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
      setSession(data.session);
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
