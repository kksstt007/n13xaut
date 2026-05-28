import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — XAUT.trade" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => { if (!loading && !isAdmin) nav({ to: "/dashboard" }); }, [loading, isAdmin, nav]);
  const [tab, setTab] = React.useState<"users" | "deposits" | "withdrawals" | "kyc" | "trades" | "control">("users");

  if (!isAdmin) return null;

  const tabs = [
    { k: "users", l: "Users" }, { k: "deposits", l: "Deposits" }, { k: "withdrawals", l: "Withdrawals" },
    { k: "kyc", l: "KYC" }, { k: "trades", l: "Live Trades" }, { k: "control", l: "Trade Control" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Admin Console</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-success/15 text-success">
            <span className="size-1.5 rounded-full bg-success animate-pulse" /> Live
          </span>
          <span className="px-2 py-1 rounded text-xs bg-destructive/15 text-destructive">Elevated access</span>
        </div>
      </div>
      <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${tab === t.k ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersAdmin />}
      {tab === "deposits" && <DepositsAdmin />}
      {tab === "withdrawals" && <WithdrawalsAdmin />}
      {tab === "kyc" && <KycAdmin />}
      {tab === "trades" && <LiveTradesAdmin />}
      {tab === "control" && <TradeControlAdmin />}
    </div>
  );
}

function useAdminQuery<T>(key: any[], q: () => Promise<T>) {
  return useQuery({ queryKey: key, queryFn: q });
}

function UsersAdmin() {
  const qc = useQueryClient();
  const { data } = useAdminQuery(["admin-users"], async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: wallets } = await supabase.from("wallets").select("*");
    return profiles?.map((p: any) => ({ ...p, wallet: wallets?.find((w: any) => w.user_id === p.id) })) ?? [];
  });
  const setBalance = useMutation({
    mutationFn: async ({ uid, val }: any) => { const { error } = await supabase.from("wallets").update({ usdt_balance: val }).eq("user_id", uid); if (error) throw error; },
    onSuccess: () => { toast.success("Balance updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const ban = useMutation({
    mutationFn: async ({ uid, banned }: any) => { const { error } = await supabase.from("profiles").update({ banned }).eq("id", uid); if (error) throw error; },
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  return (
    <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["Name","Code","Balance","Status","Actions"].map(c => <th key={c} className="text-left py-2">{c}</th>)}</tr></thead>
        <tbody>{data?.map((u: any) => (
          <tr key={u.id} className="border-b border-border/30">
            <td className="py-2.5">{u.display_name}</td>
            <td className="font-mono text-xs">{u.referral_code}</td>
            <td className="num">
              <input defaultValue={u.wallet?.usdt_balance ?? 0} type="number"
                onBlur={(e) => setBalance.mutate({ uid: u.id, val: Number(e.target.value) })}
                className="w-24 rounded bg-input border border-border px-2 py-1 num text-right" />
            </td>
            <td>{u.banned ? <span className="text-destructive text-xs">banned</span> : <span className="text-success text-xs">active</span>}</td>
            <td><button onClick={() => ban.mutate({ uid: u.id, banned: !u.banned })} className="text-xs text-destructive hover:underline">{u.banned ? "Unban" : "Ban"}</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function useRealtimeInvalidate(table: string, queryKey: string, onNewPending?: (row: any) => void) {
  const qc = useQueryClient();
  React.useEffect(() => {
    const ch = supabase
      .channel(`admin-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload: any) => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        if (payload.eventType === "INSERT" && payload.new?.status === "pending") onNewPending?.(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, table, queryKey, onNewPending]);
}

function DepositsAdmin() {
  const qc = useQueryClient();
  const { data } = useAdminQuery(["admin-deposits"], async () => (await supabase.from("deposits").select("*, profiles(display_name)").order("created_at", { ascending: false })).data ?? []);
  useRealtimeInvalidate("deposits", "admin-deposits", (row) => toast.info(`New deposit · $${fmtUSD(Number(row.amount))} on ${row.network}`));
  const review = useMutation({
    mutationFn: async ({ id, status, deposit }: any) => {
      const { error } = await supabase.from("deposits").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const { data: w } = await supabase.from("wallets").select("usdt_balance").eq("user_id", deposit.user_id).single();
        await supabase.from("wallets").update({ usdt_balance: Number(w!.usdt_balance) + Number(deposit.amount) }).eq("user_id", deposit.user_id);
      }
    },
    onSuccess: (_d, v) => { toast.success(v.status === "approved" ? "Deposit approved & credited" : "Deposit rejected"); qc.invalidateQueries({ queryKey: ["admin-deposits"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const pending = (data ?? []).filter((r: any) => r.status === "pending").length;
  return <ReviewTable title="Deposits" pending={pending} rows={data ?? []} onApprove={(d: any) => review.mutate({ id: d.id, status: "approved", deposit: d })} onReject={(d: any) => review.mutate({ id: d.id, status: "rejected", deposit: d })} busy={review.isPending} />;
}

function WithdrawalsAdmin() {
  const qc = useQueryClient();
  const { data } = useAdminQuery(["admin-withdrawals"], async () => (await supabase.from("withdrawals").select("*, profiles(display_name)").order("created_at", { ascending: false })).data ?? []);
  useRealtimeInvalidate("withdrawals", "admin-withdrawals", (row) => toast.info(`New withdrawal · $${fmtUSD(Number(row.amount))} on ${row.network}`));
  const review = useMutation({
    mutationFn: async ({ id, status, w }: any) => {
      const { error } = await supabase.from("withdrawals").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const { data: wal } = await supabase.from("wallets").select("usdt_balance").eq("user_id", w.user_id).single();
        await supabase.from("wallets").update({ usdt_balance: Math.max(0, Number(wal!.usdt_balance) - Number(w.amount)) }).eq("user_id", w.user_id);
      }
    },
    onSuccess: (_d, v) => { toast.success(v.status === "approved" ? "Withdrawal approved" : "Withdrawal rejected"); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const pending = (data ?? []).filter((r: any) => r.status === "pending").length;
  return <ReviewTable title="Withdrawals" pending={pending} rows={data ?? []} addr onApprove={(r: any) => review.mutate({ id: r.id, status: "approved", w: r })} onReject={(r: any) => review.mutate({ id: r.id, status: "rejected", w: r })} busy={review.isPending} />;
}

function ReviewTable({ rows, onApprove, onReject, addr, title, pending, busy }: any) {
  const [filter, setFilter] = React.useState<"pending" | "all">("pending");
  const filtered = (rows ?? []).filter((r: any) => filter === "all" || r.status === "pending");
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            {pending > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gold/15 text-gold font-semibold">{pending} pending</span>}
          </div>
          <div className="flex gap-1 text-xs">
            {(["pending","all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded transition ${filter === f ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"}`}>{f === "pending" ? "Pending" : "All"}</button>
            ))}
          </div>
        </div>
      )}
      <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50">
            <tr>{["User","Network","Amount", addr && "Address","Status","Date","Actions"].filter(Boolean).map((c: any) => <th key={c} className="text-left py-2">{c}</th>)}</tr>
          </thead>
          <tbody>{filtered.map((r: any) => (
            <tr key={r.id} className="border-b border-border/30">
              <td className="py-2.5">{r.profiles?.display_name ?? "—"}</td>
              <td>{r.network}</td>
              <td className="num">${fmtUSD(Number(r.amount))}</td>
              {addr && <td className="font-mono text-xs truncate max-w-[200px]">{r.address}</td>}
              <td><span className={`text-xs ${r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-gold"}`}>{r.status}</span></td>
              <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.status === "pending" && (
                <div className="flex gap-1.5">
                  <button disabled={busy} onClick={() => onApprove(r)} className="text-xs px-2 py-1 rounded bg-success/15 text-success hover:bg-success/25 disabled:opacity-50">Approve</button>
                  <button disabled={busy} onClick={() => onReject(r)} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-50">Reject</button>
                </div>
              )}</td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">{filter === "pending" ? "No pending requests" : "None"}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

function KycAdmin() {
  const qc = useQueryClient();
  const { data } = useAdminQuery(["admin-kyc"], async () => (await supabase.from("kyc_submissions").select("*, profiles(display_name)").order("created_at", { ascending: false })).data ?? []);
  const review = useMutation({
    mutationFn: async ({ id, status }: any) => { const { error } = await supabase.from("kyc_submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); },
  });
  return (
    <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["User","Name","Doc","Status","Actions"].map(c => <th key={c} className="text-left py-2">{c}</th>)}</tr></thead>
        <tbody>{data?.map((k: any) => (
          <tr key={k.id} className="border-b border-border/30">
            <td className="py-2.5">{k.profiles?.display_name}</td>
            <td>{k.full_name}</td>
            <td>{k.document_type} · {k.document_number}</td>
            <td><span className={`text-xs ${k.status === "approved" ? "text-success" : k.status === "rejected" ? "text-destructive" : "text-gold"}`}>{k.status}</span></td>
            <td>{k.status === "pending" && (
              <div className="flex gap-1.5">
                <button onClick={() => review.mutate({ id: k.id, status: "approved" })} className="text-xs px-2 py-1 rounded bg-success/15 text-success">Approve</button>
                <button onClick={() => review.mutate({ id: k.id, status: "rejected" })} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive">Reject</button>
              </div>
            )}</td>
          </tr>
        ))}{!data?.length && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No submissions</td></tr>}</tbody>
      </table>
    </div>
  );
}

function TradeControlAdmin() {
  const qc = useQueryClient();
  const { data: users } = useAdminQuery(["admin-users-min"], async () => (await supabase.from("profiles").select("id,display_name").order("display_name")).data ?? []);
  const { data: overrides } = useAdminQuery(["admin-overrides"], async () => (await supabase.from("trade_overrides").select("*")).data ?? []);
  const set = useMutation({
    mutationFn: async (row: any) => { const { error } = await supabase.from("trade_overrides").upsert(row, { onConflict: "user_id" }); if (error) throw error; },
    onSuccess: () => { toast.success("Override saved"); qc.invalidateQueries({ queryKey: ["admin-overrides"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-xs text-muted-foreground mb-4">Force the next trade outcome or set a default behaviour per user. Leave blank for fair random based on price movement.</p>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["User","Default","Next trade","Payout %"].map(c => <th key={c} className="text-left py-2">{c}</th>)}</tr></thead>
          <tbody>{users?.map((u: any) => {
            const o = overrides?.find((x: any) => x.user_id === u.id);
            return (
              <tr key={u.id} className="border-b border-border/30">
                <td className="py-2.5">{u.display_name}</td>
                <td>
                  <select defaultValue={o?.default_result ?? ""} onChange={(e) => set.mutate({ user_id: u.id, default_result: e.target.value || null, next_result: o?.next_result ?? null, win_payout_pct: o?.win_payout_pct ?? 85 })}
                    className="rounded bg-input border border-border px-2 py-1 text-xs">
                    <option value="">Random</option><option value="win">Always win</option><option value="loss">Always lose</option>
                  </select>
                </td>
                <td>
                  <select value={o?.next_result ?? ""} onChange={(e) => set.mutate({ user_id: u.id, default_result: o?.default_result ?? null, next_result: e.target.value || null, win_payout_pct: o?.win_payout_pct ?? 85 })}
                    className="rounded bg-input border border-border px-2 py-1 text-xs">
                    <option value="">—</option><option value="win">Win</option><option value="loss">Loss</option>
                  </select>
                </td>
                <td>
                  <input type="number" defaultValue={o?.win_payout_pct ?? 85}
                    onBlur={(e) => set.mutate({ user_id: u.id, default_result: o?.default_result ?? null, next_result: o?.next_result ?? null, win_payout_pct: Number(e.target.value) })}
                    className="w-20 rounded bg-input border border-border px-2 py-1 num text-right text-xs" />
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
