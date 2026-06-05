import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Copy, X, Globe2, ChevronRight, Building2, Wallet as WalletIcon, CheckCircle2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

type Method = {
  id: string;
  network: string;
  asset: string;
  enabled: boolean;
  min_deposit: number;
  fee: number;
  notes: string | null;
  country: string | null;
  country_code: string | null;
  sort_order: number;
  flow: "deposit" | "withdraw" | "both";
  display_name: string | null;
  method_type: string;
  deposit_address: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  instructions: string | null;
};

type CountryRow = {
  code: string;
  name: string;
  flag_emoji: string | null;
  sort_order: number;
  enabled: boolean;
};

export function DepositWithdraw() {
  const [open, setOpen] = React.useState<null | "deposit" | "withdraw">(null);
  const { user } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () =>
      (await supabase.from("wallets").select("usdt_balance").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const available = Number(wallet?.usdt_balance ?? 0);

  return (
    <>
      <div className="rounded-xl border border-[#D4AF37]/15 bg-[#0F0F0F] p-6 space-y-6">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Available Balance
          </div>
          <div className="mt-2.5 text-[36px] leading-none font-bold tracking-tight text-foreground tabular-nums">
            ${fmtUSD(available)}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">USDT · Tether Gold</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton kind="deposit" onClick={() => setOpen("deposit")} />
          <ActionButton kind="withdraw" onClick={() => setOpen("withdraw")} />
        </div>
      </div>

      <FundsSheet open={open === "deposit"} mode="deposit" onClose={() => setOpen(null)} available={available} />
      <FundsSheet open={open === "withdraw"} mode="withdraw" onClose={() => setOpen(null)} available={available} />
    </>
  );
}

function ActionButton({ kind, onClick }: { kind: "deposit" | "withdraw"; onClick: () => void }) {
  const isDep = kind === "deposit";
  const Icon = isDep ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <button
      onClick={onClick}
      className={
        isDep
          ? "h-11 rounded-full text-black text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:opacity-90 transition"
          : "h-11 rounded-full border border-white/10 bg-white/[0.02] text-foreground text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition"
      }
      style={
        isDep
          ? { background: "#D4AF37" }
          : undefined
      }
    >
      <Icon className="size-3.5" />
      {isDep ? "Deposit" : "Withdraw"}
    </button>
  );
}

/* ----------------------------- Funds sheet ---------------------------- */

function FundsSheet({
  open, mode, onClose, available,
}: { open: boolean; mode: "deposit" | "withdraw"; onClose: () => void; available: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: methods = [] } = useQuery<Method[]>({
    queryKey: ["deposit-methods"],
    queryFn: async () =>
      ((await supabase.from("deposit_methods").select("*").eq("enabled", true).order("sort_order").order("network")).data as Method[]) ?? [],
  });

  const { data: countries = [] } = useQuery<CountryRow[]>({
    queryKey: ["countries"],
    queryFn: async () =>
      ((await supabase.from("countries").select("*").eq("enabled", true).order("sort_order")).data as CountryRow[]) ?? [],
  });

  // Realtime: refresh methods and countries when admin updates them
  React.useEffect(() => {
    const ch = supabase
      .channel(`funds-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_methods" }, () => {
        qc.invalidateQueries({ queryKey: ["deposit-methods"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "countries" }, () => {
        qc.invalidateQueries({ queryKey: ["countries"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [countryCode, setCountryCode] = React.useState<string>("");
  React.useEffect(() => {
    if (open && countries.length && !countries.find((c) => c.code === countryCode)) {
      setCountryCode(countries[0].code);
    }
  }, [open, countries, countryCode]);

  const selectedCountry = countries.find((c) => c.code === countryCode) ?? null;

  // Filter methods: must match country_code AND flow must allow current mode
  const filtered = React.useMemo(() => {
    return methods
      .filter((m) => m.country_code === countryCode)
      .filter((m) => m.flow === "both" || m.flow === mode)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [methods, countryCode, mode]);

  const [selected, setSelected] = React.useState<Method | null>(null);
  React.useEffect(() => { setSelected(filtered[0] ?? null); /* eslint-disable-next-line */ }, [countryCode, methods.length, mode]);

  // Forms
  const [depAmount, setDepAmount] = React.useState<number>(100);
  const [txHash, setTxHash] = React.useState("");
  const [wdAddress, setWdAddress] = React.useState("");
  const [wdAmount, setWdAmount] = React.useState<number>(50);

  React.useEffect(() => { if (open) { setDepAmount(100); setWdAmount(50); setTxHash(""); setWdAddress(""); } }, [open, mode]);

  const submitDeposit = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a method");
      if (depAmount < Number(selected.min_deposit)) throw new Error(`Minimum deposit is $${selected.min_deposit}`);
      const { error } = await supabase.from("deposits").insert({
        user_id: user!.id, method_id: selected.id, network: selected.network,
        amount: depAmount, tx_hash: txHash || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deposit submitted for review"); qc.invalidateQueries({ queryKey: ["deposits"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a method");
      if (wdAmount > available) throw new Error("Insufficient balance");
      if (!wdAddress.trim()) throw new Error(selected.method_type === "bank" ? "Enter account number" : "Enter wallet address");
      const payload: any = {
        user_id: user!.id,
        network: selected.network,
        address: wdAddress.trim(),
        amount: wdAmount,
        country: selected.country ?? selectedCountry?.name ?? null,
        method_id: selected.id,
      };
      if (selected.method_type === "bank") {
        payload.bank_name = selected.bank_name;
      }
      const { error } = await supabase.from("withdrawals").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Withdrawal request submitted"); qc.invalidateQueries({ queryKey: ["withdrawals"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-surface border-t border-border"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface/95 backdrop-blur border-b border-border/60">
              <div>
                <h3 className="font-display text-base font-semibold">{mode === "deposit" ? "Deposit funds" : "Withdraw funds"}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {mode === "deposit" ? "Choose your country & method to add funds" : `Available: $${fmtUSD(available)}`}
                </p>
              </div>
              <button onClick={onClose} className="size-8 grid place-items-center rounded-full hover:bg-surface-elevated">
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Country selector */}
              <div>
                <Label icon={<Globe2 className="size-3.5" />}>Country / region</Label>
                {countries.length === 0 ? (
                  <EmptyHint>No countries configured yet. Please check back later.</EmptyHint>
                ) : (
                  <div className="mt-2 relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full appearance-none rounded-xl bg-background/40 border border-border/60 px-4 py-3 pr-10 text-sm font-medium text-foreground focus:border-gold outline-none cursor-pointer"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code} className="bg-surface">
                          {c.flag_emoji ? `${c.flag_emoji} ` : ""}{c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                )}
                {selectedCountry && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {filtered.length > 0
                      ? `${filtered.length} ${mode} method${filtered.length > 1 ? "s" : ""} available for ${selectedCountry.name}`
                      : `No ${mode} methods for ${selectedCountry.name} yet`}
                  </p>
                )}
              </div>

              {/* Method picker */}
              {filtered.length > 0 ? (
                <div>
                  <Label icon={<Building2 className="size-3.5" />}>Payment method</Label>
                  <div className="mt-2 space-y-2">
                    {filtered.map((m) => {
                      const isSel = selected?.id === m.id;
                      const title = m.display_name || (m.method_type === "bank" ? (m.bank_name || m.network) : m.network);
                      const subtitle = m.method_type === "bank"
                        ? `${m.asset} · min $${m.min_deposit}`
                        : `${m.asset} · ${m.network} · min $${m.min_deposit}`;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelected(m)}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                            isSel ? "border-gold bg-gold/5" : "border-border/60 bg-background/30 hover:border-border"
                          }`}
                        >
                          <div className={`size-10 rounded-lg grid place-items-center ${m.method_type === "bank" ? "bg-blue-500/15 text-blue-400" : "bg-gold/15 text-gold"}`}>
                            {m.method_type === "bank" ? <Building2 className="size-5" /> : <WalletIcon className="size-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>
                          </div>
                          {isSel ? <CheckCircle2 className="size-5 text-gold" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedCountry && (
                <div className="rounded-xl border border-dashed border-border/60 p-6 flex flex-col items-center justify-center text-center gap-2">
                  <Inbox className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">No payment methods available for this country.</p>
                  <p className="text-[11px] text-muted-foreground">Please choose another country or check back later.</p>
                </div>
              )}

              {/* Mode-specific body */}
              {selected && mode === "deposit" && <DepositBody method={selected} amount={depAmount} setAmount={setDepAmount} txHash={txHash} setTxHash={setTxHash} />}
              {selected && mode === "withdraw" && <WithdrawBody method={selected} amount={wdAmount} setAmount={setWdAmount} address={wdAddress} setAddress={setWdAddress} available={available} />}

              {/* Submit */}
              {selected && (
                <button
                  onClick={() => (mode === "deposit" ? submitDeposit.mutate() : submitWithdrawal.mutate())}
                  disabled={mode === "deposit" ? submitDeposit.isPending : submitWithdrawal.isPending}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 active:scale-[0.99] transition"
                  style={{ background: "linear-gradient(135deg, #E8C657 0%, #B8862F 100%)" }}
                >
                  {mode === "deposit"
                    ? (submitDeposit.isPending ? "Submitting…" : "Confirm deposit")
                    : (submitWithdrawal.isPending ? "Submitting…" : "Request withdrawal")}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* --------------------------- Mode bodies --------------------------- */

function DepositBody({ method, amount, setAmount, txHash, setTxHash }: any) {
  const isBank = method.method_type === "bank";
  return (
    <div className="space-y-3">
      <Label>{isBank ? "Bank details" : "Deposit address"}</Label>
      <div className="rounded-xl bg-background/40 border border-border/60 p-4 space-y-2.5">
        {isBank ? (
          <>
            <DetailRow label="Bank" value={method.bank_name ?? "—"} />
            <DetailRow label="Account name" value={method.account_name ?? "—"} copy />
            <DetailRow label="Account number" value={method.account_number ?? "—"} copy mono />
          </>
        ) : (
          <DetailRow label={method.network} value={method.deposit_address ?? "—"} copy mono break />
        )}
        {method.instructions && (
          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">{method.instructions}</p>
        )}
      </div>

      <Field label="Amount (USDT)">
        <input type="number" min={method.min_deposit} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input num" />
      </Field>
      <Field label={isBank ? "Reference / receipt no. (optional)" : "Transaction hash (optional)"}>
        <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder={isBank ? "Bank reference" : "0x…"} className="input font-mono text-xs" />
      </Field>
      <p className="text-[11px] text-muted-foreground">Your balance will be credited after admin verification.</p>
      <Styles />
    </div>
  );
}

function WithdrawBody({ method, amount, setAmount, address, setAddress, available }: any) {
  const isBank = method.method_type === "bank";
  return (
    <div className="space-y-3">
      <Field label={isBank ? "Your bank account number" : "Destination wallet address"}>
        <input value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder={isBank ? "Account number" : "Wallet address"}
          className="input font-mono text-xs" />
      </Field>
      <Field label="Amount (USDT)">
        <input type="number" max={available} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input num" />
      </Field>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Available ${fmtUSD(available)}</span>
        <button onClick={() => setAmount(available)} className="text-gold font-medium">Max</button>
      </div>
      {method.instructions && (
        <p className="text-[11px] text-muted-foreground p-3 rounded-lg bg-background/40 border border-border/50">{method.instructions}</p>
      )}
      <Styles />
    </div>
  );
}

/* --------------------------- UI primitives --------------------------- */

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
      {icon}{children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function DetailRow({ label, value, copy, mono, break: brk }: { label: string; value: string; copy?: boolean; mono?: boolean; break?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <div className={`flex items-center gap-2 text-right text-xs ${mono ? "font-mono" : "font-medium"} ${brk ? "break-all" : ""}`}>
        <span>{value}</span>
        {copy && value !== "—" && (
          <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-gold shrink-0">
            <Copy className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">{children}</div>;
}

function Styles() {
  return <style>{`.input{width:100%;border-radius:.75rem;background:var(--color-background);border:1px solid var(--color-border);padding:.75rem .875rem;font-size:.875rem;outline:none;color:var(--color-foreground)}.input:focus{border-color:var(--gold)}`}</style>;
}
