import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — XAUT.trade" }] }),
  component: AdminPage,
});

type TabKey = "overview" | "users" | "deposits" | "withdrawals" | "methods" | "kyc" | "trades" | "control" | "audit" | "logins";

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => { if (!loading && !isAdmin) nav({ to: "/dashboard" }); }, [loading, isAdmin, nav]);
  const [tab, setTab] = React.useState<TabKey>("overview");

  if (!isAdmin) return null;

  const tabs: { k: TabKey; l: string }[] = [
    { k: "overview", l: "Overview" },
    { k: "users", l: "Users" },
    { k: "deposits", l: "Deposits" },
    { k: "withdrawals", l: "Withdrawals" },
    { k: "methods", l: "Payment Methods" },
    { k: "kyc", l: "KYC" },
    { k: "trades", l: "Live Trades" },
    { k: "control", l: "Trade Control" },
    { k: "logins", l: "Login History" },
    { k: "audit", l: "Audit Log" },
  ];

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
      {tab === "overview" && <OverviewAdmin />}
      {tab === "users" && <UsersAdmin />}
      {tab === "deposits" && <DepositsAdmin />}
      {tab === "withdrawals" && <WithdrawalsAdmin />}
      {tab === "methods" && <MethodsAdmin />}
      {tab === "kyc" && <KycAdmin />}
      {tab === "trades" && <LiveTradesAdmin />}
      {tab === "control" && <TradeControlAdmin />}
      {tab === "logins" && <LoginHistoryAdmin />}
      {tab === "audit" && <AuditLogAdmin />}
    </div>
  );
}

function useAdminQuery<T>(key: any[], q: () => Promise<T>) {
  return useQuery({ queryKey: key, queryFn: q });
}

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const { data } = useAdminQuery(["admin-users"], async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: wallets } = await supabase.from("wallets").select("*");
    return profiles?.map((p: any) => ({ ...p, wallet: wallets?.find((w: any) => w.user_id === p.id) })) ?? [];
  });
  const setBalance = useMutation({
    mutationFn: async ({ uid, val, prev }: any) => {
      const { error } = await supabase.from("wallets").update({ usdt_balance: val }).eq("user_id", uid); if (error) throw error;
      await logAudit({ action: "wallet.balance.update", target_type: "wallet", target_id: uid, prev_value: { usdt_balance: prev }, new_value: { usdt_balance: val } });
    },
    onSuccess: () => { toast.success("Balance updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ uid, patch, prev, action }: any) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", uid); if (error) throw error;
      await logAudit({ action, target_type: "profile", target_id: uid, prev_value: prev, new_value: patch });
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const filtered = (data ?? []).filter((u: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.display_name ?? "").toLowerCase().includes(s) || (u.referral_code ?? "").toLowerCase().includes(s) || u.id.toLowerCase().includes(s);
  });
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, or user ID…"
        className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm" />
      <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["User","Balance","Risk","WD limit","Status","Note","Actions"].map(c => <th key={c} className="text-left py-2 pr-3">{c}</th>)}</tr></thead>
          <tbody>{filtered.map((u: any) => {
            const status = u.banned ? "banned" : u.frozen ? "frozen" : "active";
            const statusColor = u.banned ? "text-destructive" : u.frozen ? "text-gold" : "text-success";
            return (
              <tr key={u.id} className="border-b border-border/30 align-top">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{u.display_name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{u.referral_code}</div>
                </td>
                <td className="num pr-3">
                  <input defaultValue={u.wallet?.usdt_balance ?? 0} type="number"
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(u.wallet?.usdt_balance ?? 0)) setBalance.mutate({ uid: u.id, val: v, prev: u.wallet?.usdt_balance ?? 0 }); }}
                    className="w-24 rounded bg-input border border-border px-2 py-1 num text-right" />
                </td>
                <td className="pr-3">
                  <input type="number" min={0} max={100} defaultValue={u.risk_score ?? 0}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== u.risk_score) update.mutate({ uid: u.id, patch: { risk_score: v }, prev: { risk_score: u.risk_score }, action: "profile.risk_score.update" }); }}
                    className={`w-16 rounded bg-input border border-border px-2 py-1 text-right text-xs ${u.risk_score >= 70 ? "text-destructive" : u.risk_score >= 40 ? "text-gold" : ""}`} />
                </td>
                <td className="pr-3">
                  <input type="number" defaultValue={u.withdrawal_limit ?? ""} placeholder="∞"
                    onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== u.withdrawal_limit) update.mutate({ uid: u.id, patch: { withdrawal_limit: v }, prev: { withdrawal_limit: u.withdrawal_limit }, action: "profile.withdrawal_limit.update" }); }}
                    className="w-20 rounded bg-input border border-border px-2 py-1 num text-right text-xs" />
                </td>
                <td className={`text-xs pr-3 ${statusColor}`}>{status}</td>
                <td className="pr-3">
                  <input defaultValue={u.internal_note ?? ""} placeholder="—"
                    onBlur={(e) => { const v = e.target.value || null; if (v !== u.internal_note) update.mutate({ uid: u.id, patch: { internal_note: v }, prev: { internal_note: u.internal_note }, action: "profile.note.update" }); }}
                    className="w-48 rounded bg-input border border-border px-2 py-1 text-xs" />
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => update.mutate({ uid: u.id, patch: { frozen: !u.frozen }, prev: { frozen: u.frozen }, action: u.frozen ? "profile.unfreeze" : "profile.freeze" })}
                      className="text-[10px] px-2 py-1 rounded bg-gold/15 text-gold hover:bg-gold/25">{u.frozen ? "Unfreeze" : "Freeze"}</button>
                    <button onClick={() => update.mutate({ uid: u.id, patch: { banned: !u.banned }, prev: { banned: u.banned }, action: u.banned ? "profile.unban" : "profile.ban" })}
                      className="text-[10px] px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25">{u.banned ? "Unban" : "Ban"}</button>
                  </div>
                </td>
              </tr>
            );
          })}{!filtered.length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No users</td></tr>}</tbody>
        </table>
      </div>
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
    mutationFn: async ({ id, status, deposit, note }: any) => {
      const patch: any = { status, reviewed_at: new Date().toISOString() };
      if (note) patch.admin_note = note;
      const { error } = await supabase.from("deposits").update(patch).eq("id", id);
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
  return <ReviewTable title="Deposits" pending={pending} rows={data ?? []} onApprove={(d: any) => review.mutate({ id: d.id, status: "approved", deposit: d })} onReject={(d: any, note: string) => review.mutate({ id: d.id, status: "rejected", deposit: d, note })} busy={review.isPending} />;
}

function WithdrawalsAdmin() {
  const qc = useQueryClient();
  const { data } = useAdminQuery(["admin-withdrawals"], async () => (await supabase.from("withdrawals").select("*, profiles(display_name)").order("created_at", { ascending: false })).data ?? []);
  useRealtimeInvalidate("withdrawals", "admin-withdrawals", (row) => toast.info(`New withdrawal · $${fmtUSD(Number(row.amount))} on ${row.network}`));
  const review = useMutation({
    mutationFn: async ({ id, status, w, note }: any) => {
      const patch: any = { status, reviewed_at: new Date().toISOString() };
      if (note) patch.admin_note = note;
      const { error } = await supabase.from("withdrawals").update(patch).eq("id", id);
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
  return <ReviewTable title="Withdrawals" pending={pending} rows={data ?? []} addr onApprove={(r: any) => review.mutate({ id: r.id, status: "approved", w: r })} onReject={(r: any, note: string) => review.mutate({ id: r.id, status: "rejected", w: r, note })} busy={review.isPending} />;
}

function ReviewTable({ rows, onApprove, onReject, addr, title, pending, busy }: any) {
  const [filter, setFilter] = React.useState<"pending" | "all">("pending");
  const [rejectFor, setRejectFor] = React.useState<any>(null);
  const [note, setNote] = React.useState("");
  const filtered = (rows ?? []).filter((r: any) => filter === "all" || r.status === "pending");
  const submitReject = () => {
    if (!note.trim()) { toast.error("Please provide a rejection reason"); return; }
    onReject(rejectFor, note.trim());
    setRejectFor(null); setNote("");
  };
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
            <tr>{["User","Network","Amount", addr && "Address","Status","Note","Date","Actions"].filter(Boolean).map((c: any) => <th key={c} className="text-left py-2">{c}</th>)}</tr>
          </thead>
          <tbody>{filtered.map((r: any) => (
            <tr key={r.id} className="border-b border-border/30 align-top">
              <td className="py-2.5">{r.profiles?.display_name ?? "—"}</td>
              <td>{r.network}</td>
              <td className="num">${fmtUSD(Number(r.amount))}</td>
              {addr && <td className="font-mono text-xs truncate max-w-[200px]">{r.address}</td>}
              <td><span className={`text-xs ${r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-gold"}`}>{r.status}</span></td>
              <td className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.admin_note ?? ""}>{r.admin_note ?? "—"}</td>
              <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.status === "pending" && (
                <div className="flex gap-1.5">
                  <button disabled={busy} onClick={() => onApprove(r)} className="text-xs px-2 py-1 rounded bg-success/15 text-success hover:bg-success/25 disabled:opacity-50">Approve</button>
                  <button disabled={busy} onClick={() => { setRejectFor(r); setNote(""); }} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-50">Reject</button>
                </div>
              )}</td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">{filter === "pending" ? "No pending requests" : "None"}</td></tr>}</tbody>
        </table>
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRejectFor(null)}>
          <div className="glass rounded-xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold">Reject {title?.toLowerCase()}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {rejectFor.profiles?.display_name ?? "User"} · ${fmtUSD(Number(rejectFor.amount))} · {rejectFor.network}
              </p>
            </div>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection (visible to user)"
              rows={4}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gold/50"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectFor(null)} className="text-xs px-3 py-1.5 rounded text-muted-foreground hover:text-foreground">Cancel</button>
              <button disabled={busy || !note.trim()} onClick={submitReject} className="text-xs px-3 py-1.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50">Confirm reject</button>
            </div>
          </div>
        </div>
      )}
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

function LiveTradesAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<"open" | "settled" | "all">("open");

  const { data } = useAdminQuery(["admin-trades", filter], async () => {
    let q = supabase.from("trades").select("*, profiles(display_name)").order("opened_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    return (await q).data ?? [];
  });

  React.useEffect(() => {
    const ch = supabase
      .channel("admin-trades-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["admin-trades"] });
        if (payload.eventType === "INSERT") {
          const r = payload.new;
          toast.info(`New ${String(r.direction).toUpperCase()} · $${fmtUSD(Number(r.amount))} · ${r.duration_sec}s`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, []);

  const openCount = (data ?? []).filter((t: any) => t.status === "open").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Live Trades</h2>
          {openCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-success/15 text-success font-semibold inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success animate-pulse" /> {openCount} open
            </span>
          )}
        </div>
        <div className="flex gap-1 text-xs">
          {(["open", "settled", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded capitalize transition ${filter === f ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50">
            <tr>{["User","Dir","Amount","Duration","Payout","Open price","Status / PnL","Time"].map(c => <th key={c} className="text-left py-2">{c}</th>)}</tr>
          </thead>
          <tbody>{(data ?? []).map((t: any) => {
            const closes = new Date(t.closes_at).getTime();
            const remain = Math.max(0, Math.ceil((closes - Date.now()) / 1000));
            const mm = String(Math.floor(remain / 60)).padStart(2, "0");
            const ss = String(remain % 60).padStart(2, "0");
            const isOpen = t.status === "open";
            const isWin = t.result === "win";
            return (
              <tr key={t.id} className="border-b border-border/30">
                <td className="py-2.5">{t.profiles?.display_name ?? "—"}</td>
                <td>
                  <span className={`text-xs font-semibold ${t.direction === "buy" ? "text-success" : "text-destructive"}`}>
                    {String(t.direction).toUpperCase()}
                  </span>
                </td>
                <td className="num">${fmtUSD(Number(t.amount))}</td>
                <td className="num text-xs">{t.duration_sec}s</td>
                <td className="num text-xs text-gold">{Number(t.payout_pct)}%</td>
                <td className="num text-xs">${fmtUSD(Number(t.open_price))}</td>
                <td>
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="size-1.5 rounded-full bg-success animate-pulse" />
                      <span className="num tabular-nums text-gold">{mm}:{ss}</span>
                    </span>
                  ) : (
                    <span className={`text-xs font-semibold num ${isWin ? "text-success" : "text-destructive"}`}>
                      {isWin ? "+" : ""}${fmtUSD(Number(t.pnl ?? 0))}
                    </span>
                  )}
                </td>
                <td className="text-xs text-muted-foreground">{new Date(t.opened_at).toLocaleTimeString()}</td>
              </tr>
            );
          })}{!data?.length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No trades</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Overview / Stats ============
function OverviewAdmin() {
  const { data } = useAdminQuery(["admin-overview"], async () => {
    const [users, deposits, withdrawals, kyc, trades, wallets] = await Promise.all([
      supabase.from("profiles").select("id, frozen, banned, risk_score"),
      supabase.from("deposits").select("amount, status, created_at"),
      supabase.from("withdrawals").select("amount, status, risk_flags, created_at"),
      supabase.from("kyc_submissions").select("status"),
      supabase.from("trades").select("amount, status, pnl, opened_at"),
      supabase.from("wallets").select("usdt_balance, locked"),
    ]);
    return {
      users: users.data ?? [], deposits: deposits.data ?? [], withdrawals: withdrawals.data ?? [],
      kyc: kyc.data ?? [], trades: trades.data ?? [], wallets: wallets.data ?? [],
    };
  });
  useRealtimeInvalidate("deposits", "admin-overview");
  useRealtimeInvalidate("withdrawals", "admin-overview");
  useRealtimeInvalidate("trades", "admin-overview");

  if (!data) return <div className="glass rounded-xl p-8 text-center text-muted-foreground">Loading…</div>;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayMs = today.getTime();
  const tradesToday = data.trades.filter((t: any) => new Date(t.opened_at).getTime() >= todayMs);
  const volumeToday = tradesToday.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const pnlToday = tradesToday.filter((t: any) => t.status === "settled").reduce((s: number, t: any) => s + Number(t.pnl ?? 0), 0);
  const openTrades = data.trades.filter((t: any) => t.status === "open").length;
  const pendingDeposits = data.deposits.filter((d: any) => d.status === "pending").length;
  const pendingWithdrawals = data.withdrawals.filter((w: any) => w.status === "pending").length;
  const flaggedWithdrawals = data.withdrawals.filter((w: any) => w.status === "pending" && Array.isArray(w.risk_flags) && w.risk_flags.length).length;
  const pendingKyc = data.kyc.filter((k: any) => k.status === "pending").length;
  const totalLocked = data.wallets.reduce((s: number, w: any) => s + Number(w.locked ?? 0), 0);
  const totalBalance = data.wallets.reduce((s: number, w: any) => s + Number(w.usdt_balance ?? 0), 0);
  const frozenUsers = data.users.filter((u: any) => u.frozen).length;
  const highRiskUsers = data.users.filter((u: any) => (u.risk_score ?? 0) >= 70).length;

  const cards = [
    { label: "Total users", value: data.users.length, tone: "text-foreground" },
    { label: "Open trades", value: openTrades, tone: "text-success" },
    { label: "Volume (today)", value: `$${fmtUSD(volumeToday)}`, tone: "text-gold" },
    { label: "Net PnL (today)", value: `${pnlToday >= 0 ? "+" : ""}$${fmtUSD(pnlToday)}`, tone: pnlToday >= 0 ? "text-success" : "text-destructive" },
    { label: "Pending deposits", value: pendingDeposits, tone: pendingDeposits ? "text-gold" : "text-muted-foreground" },
    { label: "Pending withdrawals", value: pendingWithdrawals, tone: pendingWithdrawals ? "text-gold" : "text-muted-foreground" },
    { label: "Flagged withdrawals", value: flaggedWithdrawals, tone: flaggedWithdrawals ? "text-destructive" : "text-muted-foreground" },
    { label: "Pending KYC", value: pendingKyc, tone: pendingKyc ? "text-gold" : "text-muted-foreground" },
    { label: "Total balance", value: `$${fmtUSD(totalBalance)}`, tone: "text-foreground" },
    { label: "Locked in trades", value: `$${fmtUSD(totalLocked)}`, tone: "text-foreground" },
    { label: "Frozen users", value: frozenUsers, tone: frozenUsers ? "text-gold" : "text-muted-foreground" },
    { label: "High-risk users", value: highRiskUsers, tone: highRiskUsers ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="glass rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{c.label}</div>
          <div className={`mt-1 text-2xl font-bold num ${c.tone}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============ Login history ============
function LoginHistoryAdmin() {
  const { data } = useAdminQuery(["admin-logins"], async () => {
    const { data } = await supabase.from("login_history").select("*, profiles!inner(display_name)").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });
  return (
    <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["User","When","Success","Device","IP"].map(c => <th key={c} className="text-left py-2 pr-3">{c}</th>)}</tr></thead>
        <tbody>{(data ?? []).map((r: any) => (
          <tr key={r.id} className="border-b border-border/30">
            <td className="py-2.5 pr-3">{r.profiles?.display_name ?? r.user_id.slice(0, 8)}</td>
            <td className="text-xs text-muted-foreground pr-3">{new Date(r.created_at).toLocaleString()}</td>
            <td className="pr-3"><span className={`text-xs ${r.success ? "text-success" : "text-destructive"}`}>{r.success ? "OK" : r.failure_reason ?? "FAIL"}</span></td>
            <td className="text-xs text-muted-foreground pr-3 truncate max-w-[300px]">{r.user_agent ?? "—"}</td>
            <td className="text-xs font-mono pr-3">{r.ip ?? "—"}</td>
          </tr>
        ))}{!data?.length && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No login history yet</td></tr>}</tbody>
      </table>
    </div>
  );
}

// ============ Audit log ============
function AuditLogAdmin() {
  const [q, setQ] = React.useState("");
  const { data } = useAdminQuery(["admin-audit"], async () => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    return data ?? [];
  });
  const filtered = (data ?? []).filter((r: any) => !q || r.action.toLowerCase().includes(q.toLowerCase()) || (r.target_id ?? "").includes(q));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action or target id…"
          className="flex-1 rounded-lg bg-input border border-border px-3 py-2 text-sm" />
        <span className="text-xs text-muted-foreground">Immutable · {filtered.length} entries</span>
      </div>
      <div className="glass rounded-xl p-5 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{["When","Action","Target","Prev","New","Actor"].map(c => <th key={c} className="text-left py-2 pr-3">{c}</th>)}</tr></thead>
          <tbody>{filtered.map((r: any) => (
            <tr key={r.id} className="border-b border-border/30 align-top">
              <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="pr-3 text-xs font-mono text-gold">{r.action}</td>
              <td className="pr-3 text-xs font-mono">{r.target_type ?? ""}{r.target_id ? `·${r.target_id.slice(0,8)}` : ""}</td>
              <td className="pr-3 text-[10px] font-mono text-muted-foreground max-w-[200px] truncate">{r.prev_value ? JSON.stringify(r.prev_value) : "—"}</td>
              <td className="pr-3 text-[10px] font-mono max-w-[200px] truncate">{r.new_value ? JSON.stringify(r.new_value) : "—"}</td>
              <td className="pr-3 text-[10px] font-mono text-muted-foreground">{r.actor_id?.slice(0,8)}</td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No audit entries</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------- Payment methods --------------------------- */

/* --------------------------- Methods & countries admin --------------------------- */

function MethodsAdmin() {
  const qc = useQueryClient();
  const { data: methods } = useAdminQuery(["admin-methods"], async () =>
    (await supabase.from("deposit_methods").select("*").order("sort_order").order("network")).data ?? []
  );
  const { data: countries } = useAdminQuery(["admin-countries"], async () =>
    (await supabase.from("countries").select("*").order("sort_order")).data ?? []
  );

  React.useEffect(() => {
    const ch = supabase
      .channel(`admin-methods-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_methods" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-methods"] });
        qc.invalidateQueries({ queryKey: ["deposit-methods"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "countries" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-countries"] });
        qc.invalidateQueries({ queryKey: ["countries"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [editing, setEditing] = React.useState<any | null>(null);
  const [countryEditor, setCountryEditor] = React.useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (row: any) => {
      const country = (countries ?? []).find((c: any) => c.code === row.country_code);
      const payload: any = {
        country_code: row.country_code || null,
        country: country?.name ?? null,
        flow: row.flow || "both",
        sort_order: Number(row.sort_order) || 0,
        display_name: row.display_name || null,
        method_type: row.method_type || "crypto",
        network: row.network,
        asset: row.asset || "USDT",
        enabled: !!row.enabled,
        min_deposit: Number(row.min_deposit) || 0,
        fee: Number(row.fee) || 0,
        deposit_address: row.deposit_address || null,
        bank_name: row.bank_name || null,
        account_name: row.account_name || null,
        account_number: row.account_number || null,
        instructions: row.instructions || null,
        notes: row.notes || null,
      };
      if (row.id) {
        const { error } = await supabase.from("deposit_methods").update(payload).eq("id", row.id); if (error) throw error;
      } else {
        const { error } = await supabase.from("deposit_methods").insert(payload); if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Method saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-methods"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("deposit_methods").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-methods"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("deposit_methods").update({ enabled }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-methods"] }),
  });

  const updateMethodSort = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from("deposit_methods").update({ sort_order }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-methods"] }),
  });

  const moveMethod = (list: any[], id: string, delta: number) => {
    const ordered = [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const i = ordered.findIndex((m) => m.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const a = ordered[i], b = ordered[j];
    updateMethodSort.mutate({ id: a.id, sort_order: b.sort_order ?? 0 });
    updateMethodSort.mutate({ id: b.id, sort_order: a.sort_order ?? 0 });
  };

  /* country mutations */
  const saveCountry = useMutation({
    mutationFn: async (row: any) => {
      const payload = {
        code: row.code?.trim()?.toUpperCase(),
        name: row.name?.trim(),
        flag_emoji: row.flag_emoji?.trim() || null,
        sort_order: Number(row.sort_order) || 0,
        enabled: row.enabled !== false,
      };
      if (!payload.code || !payload.name) throw new Error("Code and name are required");
      const { error } = await supabase.from("countries").upsert(payload, { onConflict: "code" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Country saved"); setCountryEditor(null); qc.invalidateQueries({ queryKey: ["admin-countries"] }); qc.invalidateQueries({ queryKey: ["countries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCountrySort = useMutation({
    mutationFn: async ({ code, sort_order }: { code: string; sort_order: number }) => {
      const { error } = await supabase.from("countries").update({ sort_order }).eq("code", code); if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-countries"] }); qc.invalidateQueries({ queryKey: ["countries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCountry = useMutation({
    mutationFn: async ({ code, enabled }: { code: string; enabled: boolean }) => {
      const { error } = await supabase.from("countries").update({ enabled }).eq("code", code); if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-countries"] }); qc.invalidateQueries({ queryKey: ["countries"] }); },
  });

  const removeCountry = useMutation({
    mutationFn: async (code: string) => { const { error } = await supabase.from("countries").delete().eq("code", code); if (error) throw error; },
    onSuccess: () => { toast.success("Country deleted"); qc.invalidateQueries({ queryKey: ["admin-countries"] }); qc.invalidateQueries({ queryKey: ["countries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const moveCountry = (code: string, delta: number) => {
    const list = [...(countries ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const i = list.findIndex((c: any) => c.code === code);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    updateCountrySort.mutate({ code: a.code, sort_order: b.sort_order });
    updateCountrySort.mutate({ code: b.code, sort_order: a.sort_order });
  };

  /* group methods by country_code (with "Unassigned" bucket) */
  const grouped = React.useMemo(() => {
    const map = new Map<string, any[]>();
    (methods ?? []).forEach((m: any) => {
      const key = m.country_code || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [methods]);

  const sortedCountries = React.useMemo(
    () => [...(countries ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
    [countries]
  );

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Manage countries and their payment methods. Changes go live in real time.</p>

      {/* Countries panel */}
      <div className="glass rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Countries</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Each country has its own list of deposit & withdrawal methods.</p>
          </div>
          <button onClick={() => setCountryEditor({ code: "", name: "", flag_emoji: "", sort_order: ((countries?.length ?? 0) + 1) * 10, enabled: true })}
            className="text-xs px-3 py-1.5 rounded bg-gold/15 text-gold hover:bg-gold/25 font-semibold">+ Add country</button>
        </div>
        <div className="space-y-1.5">
          {sortedCountries.map((c: any, idx: number, arr: any[]) => {
            const methodCount = grouped.get(c.code)?.length ?? 0;
            return (
              <div key={c.code} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/40 border border-border/50">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveCountry(c.code, -1)} disabled={idx === 0} className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface disabled:opacity-30">▲</button>
                  <button onClick={() => moveCountry(c.code, 1)} disabled={idx === arr.length - 1} className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface disabled:opacity-30">▼</button>
                </div>
                <span className="text-xl w-7 text-center">{c.flag_emoji ?? "🏳️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{c.code} · {methodCount} method{methodCount === 1 ? "" : "s"}</div>
                </div>
                <input type="number" defaultValue={c.sort_order}
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== c.sort_order) updateCountrySort.mutate({ code: c.code, sort_order: v }); }}
                  className="w-16 rounded bg-input border border-border px-2 py-1 num text-right text-xs" />
                <button onClick={() => toggleCountry.mutate({ code: c.code, enabled: !c.enabled })}
                  className={`text-[10px] px-2 py-1 rounded ${c.enabled ? "bg-success/15 text-success" : "bg-muted/30 text-muted-foreground"}`}>
                  {c.enabled ? "Enabled" : "Disabled"}
                </button>
                <button onClick={() => setEditing({ country_code: c.code, method_type: "crypto", flow: "both", enabled: true, min_deposit: 10, fee: 0, asset: "USDT", sort_order: (methodCount + 1) * 10 })}
                  className="text-[10px] px-2 py-1 rounded bg-gold/15 text-gold hover:bg-gold/25 font-semibold whitespace-nowrap">+ Method</button>
                <button onClick={() => setCountryEditor(c)} className="text-[10px] px-2 py-1 rounded bg-surface-elevated hover:bg-surface">Edit</button>
                <button onClick={() => { if (confirm(`Delete ${c.name}? Its payment methods will be unassigned.`)) removeCountry.mutate(c.code); }} className="text-[10px] px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25">×</button>
              </div>
            );
          })}
          {!countries?.length && <p className="text-center text-xs text-muted-foreground py-4">No countries yet. Add one to start.</p>}
        </div>
      </div>

      {/* Methods grouped by country */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment methods</h3>
          <button onClick={() => setEditing({ method_type: "crypto", flow: "both", enabled: true, min_deposit: 10, fee: 0, asset: "USDT", sort_order: 10 })}
            className="text-xs px-3 py-1.5 rounded bg-gold/15 text-gold hover:bg-gold/25 font-semibold">+ New method</button>
        </div>

        {sortedCountries.map((c: any) => {
          const list = (grouped.get(c.code) ?? []).slice().sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          return (
            <div key={c.code} className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="text-lg">{c.flag_emoji ?? "🌐"}</span>
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-[10px] text-muted-foreground">· {list.length} method{list.length === 1 ? "" : "s"}</span>
                <button onClick={() => setEditing({ country_code: c.code, method_type: "crypto", flow: "both", enabled: true, min_deposit: 10, fee: 0, asset: "USDT", sort_order: (list.length + 1) * 10 })}
                  className="ml-auto text-[10px] px-2 py-1 rounded bg-gold/15 text-gold hover:bg-gold/25 font-semibold">+ Add</button>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No methods for {c.name} yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground"><tr>{["Order","Flow","Type","Name","Network","Min","Status","Actions"].map(col => <th key={col} className="text-left py-1.5 pr-3">{col}</th>)}</tr></thead>
                  <tbody>{list.map((m: any, idx: number) => (
                    <tr key={m.id} className="border-b border-border/20 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveMethod(list, m.id, -1)} disabled={idx === 0} className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface disabled:opacity-30">▲</button>
                          <button onClick={() => moveMethod(list, m.id, 1)} disabled={idx === list.length - 1} className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface disabled:opacity-30">▼</button>
                          <span className="text-[10px] text-muted-foreground ml-1 num">{m.sort_order ?? 0}</span>
                        </div>
                      </td>
                      <td className="pr-3 text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${m.flow === "deposit" ? "bg-emerald-500/15 text-emerald-400" : m.flow === "withdraw" ? "bg-rose-500/15 text-rose-400" : "bg-muted/30 text-muted-foreground"}`}>{m.flow ?? "both"}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs"><span className={`px-1.5 py-0.5 rounded ${m.method_type === "bank" ? "bg-blue-500/15 text-blue-400" : "bg-gold/15 text-gold"}`}>{m.method_type}</span></td>
                      <td className="pr-3">{m.display_name ?? m.bank_name ?? m.network}</td>
                      <td className="pr-3 text-xs">{m.network}</td>
                      <td className="pr-3 num">${fmtUSD(Number(m.min_deposit))}</td>
                      <td className="pr-3">
                        <button onClick={() => toggle.mutate({ id: m.id, enabled: !m.enabled })} className={`text-xs px-2 py-0.5 rounded ${m.enabled ? "bg-success/15 text-success" : "bg-muted/30 text-muted-foreground"}`}>
                          {m.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td className="flex gap-1.5 py-2">
                        <button onClick={() => setEditing(m)} className="text-xs px-2 py-1 rounded bg-surface-elevated hover:bg-surface">Edit</button>
                        <button onClick={() => { if (confirm("Delete this method?")) remove.mutate(m.id); }} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25">Delete</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Unassigned methods */}
        {grouped.get("__none__") && grouped.get("__none__")!.length > 0 && (
          <div className="glass rounded-xl p-5 space-y-2 border border-amber-500/30">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-semibold">Unassigned (no country)</span>
              <span className="text-[10px] text-muted-foreground">· {grouped.get("__none__")!.length} method(s)</span>
            </div>
            <table className="w-full text-sm">
              <tbody>{grouped.get("__none__")!.map((m: any) => (
                <tr key={m.id} className="border-b border-border/20 last:border-0">
                  <td className="pr-3">{m.display_name ?? m.bank_name ?? m.network}</td>
                  <td className="pr-3 text-xs">{m.network}</td>
                  <td className="flex gap-1.5 py-2">
                    <button onClick={() => setEditing(m)} className="text-xs px-2 py-1 rounded bg-surface-elevated hover:bg-surface">Assign country</button>
                    <button onClick={() => { if (confirm("Delete this method?")) remove.mutate(m.id); }} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25">Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {!methods?.length && <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">No methods yet. Add one to start accepting deposits.</div>}
      </div>

      {editing && <MethodEditor row={editing} countries={countries ?? []} onCancel={() => setEditing(null)} onSave={(r) => save.mutate(r)} saving={save.isPending} />}
      {countryEditor && <CountryEditor row={countryEditor} onCancel={() => setCountryEditor(null)} onSave={(r) => saveCountry.mutate(r)} saving={saveCountry.isPending} />}
    </div>
  );
}

function MethodEditor({ row, countries, onCancel, onSave, saving }: { row: any; countries: any[]; onCancel: () => void; onSave: (r: any) => void; saving: boolean }) {
  const [f, setF] = React.useState<any>(row);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const isBank = (f.method_type ?? "crypto") === "bank";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto" onClick={onCancel}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">{f.id ? "Edit method" : "New payment method"}</h3>

        <div className="grid grid-cols-2 gap-3">
          <Fld label="Country *">
            <select value={f.country_code ?? ""} onChange={(e) => set("country_code", e.target.value)} className="adm-input">
              <option value="">— Select country —</option>
              {[...countries].sort((a, b) => a.sort_order - b.sort_order).map((c) => (
                <option key={c.code} value={c.code}>{c.flag_emoji ? `${c.flag_emoji} ` : ""}{c.name}</option>
              ))}
            </select>
          </Fld>
          <Fld label="Flow">
            <select value={f.flow ?? "both"} onChange={(e) => set("flow", e.target.value)} className="adm-input">
              <option value="both">Both (deposit & withdraw)</option>
              <option value="deposit">Deposit only</option>
              <option value="withdraw">Withdraw only</option>
            </select>
          </Fld>
          <Fld label="Method type">
            <select value={f.method_type ?? "crypto"} onChange={(e) => set("method_type", e.target.value)} className="adm-input">
              <option value="crypto">Crypto / Wallet</option>
              <option value="bank">Bank transfer</option>
            </select>
          </Fld>
          <Fld label="Sort order">
            <input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", e.target.value)} className="adm-input num" />
          </Fld>
          <Fld label="Display name (optional)">
            <input value={f.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} placeholder="e.g. KBZ Bank" className="adm-input" />
          </Fld>
          <Fld label="Network / channel">
            <input value={f.network ?? ""} onChange={(e) => set("network", e.target.value)} placeholder={isBank ? "BANK / KBZ Pay" : "TRC20"} className="adm-input" />
          </Fld>
          <Fld label="Asset">
            <input value={f.asset ?? "USDT"} onChange={(e) => set("asset", e.target.value)} className="adm-input" />
          </Fld>
          <Fld label="Min deposit (USDT)">
            <input type="number" value={f.min_deposit ?? 10} onChange={(e) => set("min_deposit", e.target.value)} className="adm-input num" />
          </Fld>
        </div>

        {isBank ? (
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Bank name">
              <input value={f.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} className="adm-input" />
            </Fld>
            <Fld label="Account name">
              <input value={f.account_name ?? ""} onChange={(e) => set("account_name", e.target.value)} className="adm-input" />
            </Fld>
            <div className="col-span-2">
              <Fld label="Account number">
                <input value={f.account_number ?? ""} onChange={(e) => set("account_number", e.target.value)} className="adm-input font-mono" />
              </Fld>
            </div>
          </div>
        ) : (
          <Fld label="Deposit address">
            <input value={f.deposit_address ?? ""} onChange={(e) => set("deposit_address", e.target.value)} className="adm-input font-mono text-xs" />
          </Fld>
        )}

        <Fld label="Instructions (shown to user)">
          <textarea value={f.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} rows={3} className="adm-input resize-none" />
        </Fld>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          Enabled (visible to users)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="text-xs px-3 py-2 rounded text-muted-foreground hover:text-foreground">Cancel</button>
          <button disabled={saving || !f.network || !f.country_code} onClick={() => onSave(f)} className="text-xs px-4 py-2 rounded bg-gradient-to-r from-[#E8C657] to-[#B8862F] text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save method"}
          </button>
        </div>
        <style>{`.adm-input{width:100%;border-radius:.5rem;background:var(--color-input);border:1px solid var(--color-border);padding:.5rem .75rem;font-size:.875rem;outline:none;color:var(--color-foreground)}.adm-input:focus{border-color:var(--gold)}`}</style>
      </div>
    </div>
  );
}

function CountryEditor({ row, onCancel, onSave, saving }: { row: any; onCancel: () => void; onSave: (r: any) => void; saving: boolean }) {
  const [f, setF] = React.useState<any>(row);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const isNew = !row.code;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">{isNew ? "New country" : "Edit country"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Code (e.g. MM)">
            <input value={f.code ?? ""} onChange={(e) => set("code", e.target.value.toUpperCase())} className="adm-input font-mono" disabled={!isNew} />
          </Fld>
          <Fld label="Name">
            <input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} className="adm-input" />
          </Fld>
          <Fld label="Flag emoji">
            <input value={f.flag_emoji ?? ""} onChange={(e) => set("flag_emoji", e.target.value)} placeholder="🇲🇲" className="adm-input" />
          </Fld>
          <Fld label="Sort order">
            <input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", e.target.value)} className="adm-input num" />
          </Fld>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.enabled !== false} onChange={(e) => set("enabled", e.target.checked)} />
          Enabled
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="text-xs px-3 py-2 rounded text-muted-foreground hover:text-foreground">Cancel</button>
          <button disabled={saving} onClick={() => onSave(f)} className="text-xs px-4 py-2 rounded bg-gradient-to-r from-[#E8C657] to-[#B8862F] text-primary-foreground font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save country"}</button>
        </div>
        <style>{`.adm-input{width:100%;border-radius:.5rem;background:var(--color-input);border:1px solid var(--color-border);padding:.5rem .75rem;font-size:.875rem;outline:none;color:var(--color-foreground)}.adm-input:focus{border-color:var(--gold)}`}</style>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}


