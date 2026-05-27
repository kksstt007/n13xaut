import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — XAUT.trade" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"deposit" | "withdraw">("deposit");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: methods } = useQuery({
    queryKey: ["methods"],
    queryFn: async () => (await supabase.from("deposit_methods").select("*").eq("enabled", true)).data ?? [],
  });
  const { data: deposits } = useQuery({
    queryKey: ["deposits", user?.id],
    queryFn: async () => (await supabase.from("deposits").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const [selectedMethod, setSelectedMethod] = React.useState<any>(null);
  React.useEffect(() => { if (methods?.length && !selectedMethod) setSelectedMethod(methods[0]); }, [methods, selectedMethod]);
  const [depAmount, setDepAmount] = React.useState(100);
  const [txHash, setTxHash] = React.useState("");

  const submitDeposit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deposits").insert({
        user_id: user!.id, method_id: selectedMethod.id, network: selectedMethod.network,
        amount: depAmount, tx_hash: txHash || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deposit submitted for review"); setTxHash(""); qc.invalidateQueries({ queryKey: ["deposits"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [wdNetwork, setWdNetwork] = React.useState("TRC20");
  const [wdAddress, setWdAddress] = React.useState("");
  const [wdAmount, setWdAmount] = React.useState(50);

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      if (wdAmount > Number(wallet?.usdt_balance ?? 0)) throw new Error("Insufficient balance");
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id, network: wdNetwork, address: wdAddress, amount: wdAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Withdrawal request submitted"); qc.invalidateQueries({ queryKey: ["withdrawals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5 flex flex-wrap justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Available balance</div>
          <div className="num text-3xl font-bold mt-1">${fmtUSD(Number(wallet?.usdt_balance ?? 0))} <span className="text-base text-gold">USDT</span></div>
          <div className="text-xs text-muted-foreground mt-1">In positions: ${fmtUSD(Number(wallet?.locked ?? 0))}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("deposit")} className={`px-5 py-2.5 rounded-lg text-sm font-medium ${tab === "deposit" ? "bg-gradient-gold text-primary-foreground" : "bg-surface-elevated"}`}>Deposit</button>
          <button onClick={() => setTab("withdraw")} className={`px-5 py-2.5 rounded-lg text-sm font-medium ${tab === "withdraw" ? "bg-gradient-gold text-primary-foreground" : "bg-surface-elevated"}`}>Withdraw</button>
        </div>
      </div>

      {tab === "deposit" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">1. Select network</h3>
            <div className="grid grid-cols-3 gap-2">
              {methods?.map((m: any) => (
                <button key={m.id} onClick={() => setSelectedMethod(m)}
                  className={`p-3 rounded-lg border text-sm transition ${selectedMethod?.id === m.id ? "border-gold bg-gold/10" : "border-border bg-surface-elevated"}`}>
                  <div className="font-semibold">{m.network}</div>
                  <div className="text-xs text-muted-foreground mt-1">min ${m.min_deposit}</div>
                </button>
              ))}
            </div>
            {selectedMethod && (
              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Deposit address</label>
                  <div className="mt-1 flex items-center gap-2 p-3 rounded-lg bg-surface-elevated font-mono text-xs break-all">
                    {selectedMethod.deposit_address}
                    <button onClick={() => { navigator.clipboard.writeText(selectedMethod.deposit_address); toast.success("Copied"); }}>
                      <Copy className="size-4 text-gold flex-shrink-0" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Send only USDT on {selectedMethod.network}. Other assets may be lost.</p>
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">2. Confirm your deposit</h3>
            <label className="text-xs text-muted-foreground">Amount (USDT)</label>
            <input type="number" value={depAmount} onChange={(e) => setDepAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 num outline-none focus:border-gold" />
            <label className="block mt-3 text-xs text-muted-foreground">Tx hash (optional)</label>
            <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x…"
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 text-xs font-mono outline-none focus:border-gold" />
            <button onClick={() => submitDeposit.mutate()} disabled={submitDeposit.isPending}
              className="mt-4 w-full rounded-lg bg-gradient-gold py-3 font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
              Submit deposit
            </button>
            <p className="mt-2 text-xs text-muted-foreground">Funds credit after admin verifies on-chain.</p>
          </div>

          <div className="lg:col-span-2 glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Deposit history</h3>
            <HistoryTable rows={deposits ?? []} cols={["Network","Amount","Status","Date"]} render={(d) => [d.network, `$${fmtUSD(Number(d.amount))}`, <StatusPill key="s" s={d.status} />, new Date(d.created_at).toLocaleString()]} />
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Withdraw USDT</h3>
            <label className="text-xs text-muted-foreground">Network</label>
            <select value={wdNetwork} onChange={(e) => setWdNetwork(e.target.value)} className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 outline-none focus:border-gold">
              {["TRC20","ERC20","BEP20"].map((n) => <option key={n}>{n}</option>)}
            </select>
            <label className="block mt-3 text-xs text-muted-foreground">Destination address</label>
            <input value={wdAddress} onChange={(e) => setWdAddress(e.target.value)} placeholder="Wallet address"
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 text-xs font-mono outline-none focus:border-gold" />
            <label className="block mt-3 text-xs text-muted-foreground">Amount (USDT)</label>
            <input type="number" value={wdAmount} onChange={(e) => setWdAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2.5 num outline-none focus:border-gold" />
            <button onClick={() => submitWithdrawal.mutate()} disabled={submitWithdrawal.isPending || !wdAddress}
              className="mt-4 w-full rounded-lg bg-gradient-gold py-3 font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
              Request withdrawal
            </button>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Withdrawal history</h3>
            <HistoryTable rows={withdrawals ?? []} cols={["Network","Amount","Status","Date"]} render={(w) => [w.network, `$${fmtUSD(Number(w.amount))}`, <StatusPill key="s" s={w.status} />, new Date(w.created_at).toLocaleString()]} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = { pending: "bg-gold/15 text-gold", approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive" };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[s] ?? ""}`}>{s}</span>;
}

function HistoryTable({ rows, cols, render }: { rows: any[]; cols: string[]; render: (r: any) => React.ReactNode[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border/50"><tr>{cols.map((c) => <th key={c} className="text-left py-2">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id ?? i} className="border-b border-border/30">
            {render(r).map((cell, j) => <td key={j} className="py-2.5">{cell}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
