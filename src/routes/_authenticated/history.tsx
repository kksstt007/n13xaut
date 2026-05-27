import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Trade History — XAUT.trade" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => (await supabase.from("trades").select("*").eq("user_id", user!.id).order("opened_at", { ascending: false }).limit(100)).data ?? [],
    enabled: !!user,
  });

  const settled = data?.filter((t: any) => t.status === "settled") ?? [];
  const wins = settled.filter((t: any) => t.result === "win").length;
  const totalPnl = settled.reduce((a: number, t: any) => a + Number(t.pnl ?? 0), 0);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Trading history</h1>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Total trades</div><div className="num text-2xl font-bold mt-1">{settled.length}</div></div>
        <div className="glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Win rate</div><div className="num text-2xl font-bold mt-1">{settled.length ? ((wins / settled.length) * 100).toFixed(1) : "0"}%</div></div>
        <div className="glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Net P/L</div><div className={`num text-2xl font-bold mt-1 ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>{totalPnl >= 0 ? "+" : ""}${fmtUSD(totalPnl)}</div></div>
      </div>
      <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50">
            <tr>{["Time","Dir","Amount","Entry","Close","Result","P/L"].map((c) => <th key={c} className="text-left py-2">{c}</th>)}</tr>
          </thead>
          <tbody>
            {data?.map((t: any) => (
              <tr key={t.id} className="border-b border-border/30">
                <td className="py-2.5 text-xs text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${t.direction === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{t.direction.toUpperCase()}</span></td>
                <td className="num">${fmtUSD(Number(t.amount))}</td>
                <td className="num">${fmtUSD(Number(t.open_price))}</td>
                <td className="num">{t.close_price ? `$${fmtUSD(Number(t.close_price))}` : "—"}</td>
                <td className="text-xs">{t.result ?? <span className="text-muted-foreground">open</span>}</td>
                <td className={`num ${Number(t.pnl ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>{t.pnl != null ? `${Number(t.pnl) >= 0 ? "+" : ""}$${fmtUSD(Number(t.pnl))}` : "—"}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No trades yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
