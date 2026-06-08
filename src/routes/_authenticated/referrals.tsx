import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — XAUT.trade" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await (supabase.from("profiles_safe" as any).select("*").eq("id", user!.id).single() as any)).data,
    enabled: !!user,
  });
  const { data: refs } = useQuery({
    queryKey: ["refs", user?.id],
    queryFn: async () => (await supabase.from("referrals").select("*").eq("referrer_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${profile?.referral_code ?? ""}` : "";
  const totalEarned = refs?.reduce((a, r) => a + Number(r.commission), 0) ?? 0;

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Referral program</h1>
      <div className="glass-gold rounded-xl p-6">
        <div className="text-xs text-muted-foreground">Your referral link</div>
        <div className="mt-2 flex items-center gap-2 p-3 rounded-lg bg-surface-elevated text-xs font-mono break-all">
          {link}
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
            <Copy className="size-4 text-gold flex-shrink-0" />
          </button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Code: <span className="text-gold font-mono">{profile?.referral_code}</span></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-5"><Users className="size-5 text-gold" /><div className="num text-3xl font-bold mt-3">{refs?.length ?? 0}</div><div className="text-xs text-muted-foreground">Referred users</div></div>
        <div className="glass rounded-xl p-5"><div className="text-gold text-xl">$</div><div className="num text-3xl font-bold mt-3">${fmtUSD(totalEarned)}</div><div className="text-xs text-muted-foreground">Commissions earned</div></div>
      </div>
    </div>
  );
}
