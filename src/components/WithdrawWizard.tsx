import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X, ArrowLeft, Search, Building2, Wallet as WalletIcon,
  ChevronRight, Check, ShieldCheck, Info,
} from "lucide-react";
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

type Country = {
  code: string;
  name: string;
  flag_emoji: string | null;
  sort_order: number;
  enabled: boolean;
};

type Step = 1 | 2 | 3 | 4;

export function WithdrawWizard({
  open, onClose, available,
}: { open: boolean; onClose: () => void; available: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: methods = [] } = useQuery<Method[]>({
    queryKey: ["deposit-methods"],
    queryFn: async () =>
      ((await supabase.from("deposit_methods").select("*").eq("enabled", true).order("sort_order").order("network")).data as Method[]) ?? [],
  });

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: async () =>
      ((await supabase.from("countries").select("*").eq("enabled", true).order("sort_order")).data as Country[]) ?? [],
  });

  const [step, setStep] = React.useState<Step>(1);
  const [query, setQuery] = React.useState("");
  const [country, setCountry] = React.useState<Country | null>(null);
  const [method, setMethod] = React.useState<Method | null>(null);
  const [amount, setAmount] = React.useState<string>("");
  const [address, setAddress] = React.useState("");
  const [note, setNote] = React.useState("");

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setStep(1); setQuery(""); setCountry(null); setMethod(null);
      setAmount(""); setAddress(""); setNote("");
    }
  }, [open]);

  const filteredCountries = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries.slice(0, 8);
    return countries
      .filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .slice(0, 12);
  }, [countries, query]);

  const countryMethods = React.useMemo(() => {
    if (!country) return [];
    return methods
      .filter((m) => m.country_code === country.code)
      .filter((m) => m.flow === "both" || m.flow === "withdraw")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [methods, country]);

  const amountNum = Number(amount) || 0;
  const fee = method ? Number(method.fee || 0) : 0;
  const netReceive = Math.max(0, amountNum - fee);
  const minAmt = method ? Number(method.min_deposit || 0) : 0;
  const amountError =
    amountNum <= 0 ? "Enter an amount"
    : amountNum < minAmt ? `Minimum is $${minAmt}`
    : amountNum > available ? "Exceeds available balance"
    : null;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !method || !country) throw new Error("Missing details");
      if (amountError) throw new Error(amountError);
      if (!address.trim()) throw new Error(
        method.method_type === "bank" ? "Enter your account number" : "Enter destination wallet address"
      );
      const payload: any = {
        user_id: user.id,
        network: method.network,
        address: address.trim(),
        amount: amountNum,
        country: country.name,
        method_id: method.id,
        user_note: note.trim() || null,
      };
      if (method.method_type === "bank") payload.bank_name = method.bank_name;
      const { error } = await supabase.from("withdrawals").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted for review");
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canNext =
    (step === 1 && !!country) ||
    (step === 2 && !!method) ||
    (step === 3 && !amountError && address.trim().length > 0) ||
    step === 4;

  const goNext = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
    else submit.mutate();
  };
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else onClose();
  };

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
            className="fixed bottom-0 inset-x-0 z-50 max-h-[94vh] overflow-hidden rounded-t-3xl bg-surface border-t border-border flex flex-col"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated -ml-2"
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-display text-[15px] font-semibold leading-tight">Withdraw funds</h3>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    Step {step} of 4 · Available ${fmtUSD(available)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated -mr-2"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <Stepper step={step} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 1 && (
                    <StepCountry
                      query={query} setQuery={setQuery}
                      options={filteredCountries} selected={country} onSelect={(c) => { setCountry(c); setMethod(null); }}
                      total={countries.length}
                    />
                  )}
                  {step === 2 && country && (
                    <StepMethod
                      country={country} options={countryMethods}
                      selected={method} onSelect={setMethod}
                    />
                  )}
                  {step === 3 && method && (
                    <StepAmount
                      method={method} amount={amount} setAmount={setAmount}
                      address={address} setAddress={setAddress}
                      available={available} fee={fee} netReceive={netReceive} error={amountError}
                    />
                  )}
                  {step === 4 && method && country && (
                    <StepReview
                      country={country} method={method} amount={amountNum}
                      address={address} note={note} setNote={setNote}
                      fee={fee} netReceive={netReceive}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 pt-3 border-t border-border/60">
              <button
                onClick={goNext}
                disabled={!canNext || submit.isPending}
                className="w-full h-12 rounded-xl text-[14px] font-semibold text-primary-foreground disabled:opacity-50 active:scale-[0.99] transition"
                style={{ background: "linear-gradient(135deg, #E8C657 0%, #B8862F 100%)" }}
              >
                {submit.isPending ? "Submitting…" : step === 4 ? "Confirm withdrawal" : "Continue"}
              </button>
              <p className="mt-2 text-center text-[10.5px] text-muted-foreground inline-flex items-center justify-center gap-1 w-full">
                <ShieldCheck className="size-3" />
                Reviewed by our team within 24 hours
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- Stepper -------------------------------- */

function Stepper({ step }: { step: Step }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors ${
            i <= step ? "bg-gold" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- Step 1 -------------------------------- */

function StepCountry({
  query, setQuery, options, selected, onSelect, total,
}: {
  query: string; setQuery: (s: string) => void;
  options: Country[]; selected: Country | null;
  onSelect: (c: Country) => void; total: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[15px] font-semibold">Where are you withdrawing to?</h4>
        <p className="text-[12px] text-muted-foreground mt-1">Type your country name to see available methods.</p>
      </div>
      <div className="relative">
        <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${total} countries…`}
          className="w-full h-12 rounded-xl bg-background/40 border border-border/60 pl-10 pr-3 text-[14px] outline-none focus:border-gold transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        {options.length === 0 && (
          <div className="text-center py-10 text-[12px] text-muted-foreground">
            No countries match "<span className="text-foreground">{query}</span>"
          </div>
        )}
        {options.map((c) => {
          const sel = selected?.code === c.code;
          return (
            <button
              key={c.code}
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                sel ? "border-gold bg-gold/5" : "border-border/60 hover:border-border bg-background/20"
              }`}
            >
              <span className="text-xl leading-none w-7 text-center">{c.flag_emoji ?? "🏳️"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{c.name}</div>
                <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{c.code}</div>
              </div>
              {sel ? <Check className="size-4 text-gold" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- Step 2 -------------------------------- */

function StepMethod({
  country, options, selected, onSelect,
}: {
  country: Country; options: Method[];
  selected: Method | null; onSelect: (m: Method) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[15px] font-semibold">Choose withdrawal method</h4>
        <p className="text-[12px] text-muted-foreground mt-1">
          {country.flag_emoji} {country.name} · {options.length} available
        </p>
      </div>
      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <Info className="size-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] font-medium">No methods configured</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            We don't support withdrawals to {country.name} yet. Please choose another country.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((m) => {
            const isBank = m.method_type === "bank";
            const sel = selected?.id === m.id;
            const title = m.display_name || (isBank ? (m.bank_name || m.network) : m.network);
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  sel ? "border-gold bg-gold/5" : "border-border/60 hover:border-border bg-background/20"
                }`}
              >
                <div className={`size-11 rounded-xl grid place-items-center shrink-0 ${
                  isBank ? "bg-blue-500/15 text-blue-400" : "bg-gold/15 text-gold"
                }`}>
                  {isBank ? <Building2 className="size-5" /> : <WalletIcon className="size-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate">{title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {isBank ? `Bank transfer · ${m.asset}` : `${m.asset} · ${m.network}`} · min ${m.min_deposit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider">Fee</div>
                  <div className="text-[12px] font-semibold tabular-nums">${Number(m.fee || 0).toFixed(2)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Step 3 -------------------------------- */

function StepAmount({
  method, amount, setAmount, address, setAddress, available, fee, netReceive, error,
}: {
  method: Method;
  amount: string; setAmount: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  available: number; fee: number; netReceive: number; error: string | null;
}) {
  const isBank = method.method_type === "bank";
  const quick = [25, 50, 75, 100];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-[15px] font-semibold">Amount & destination</h4>
        <p className="text-[12px] text-muted-foreground mt-1">Min ${method.min_deposit} · Fee ${fee.toFixed(2)}</p>
      </div>

      {/* Amount */}
      <div className="rounded-2xl border border-border/60 bg-background/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">You withdraw</span>
          <button
            onClick={() => setAmount(String(available))}
            className="text-[11px] font-semibold text-gold"
          >MAX</button>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[22px] font-semibold text-muted-foreground">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="flex-1 bg-transparent text-[32px] font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
          />
          <span className="text-[12px] font-medium text-muted-foreground">USDT</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {quick.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(Math.floor(available * p / 100)))}
              className="flex-1 h-8 rounded-lg border border-border/60 text-[11px] font-medium text-muted-foreground hover:border-gold hover:text-gold transition"
            >{p}%</button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5 text-[11.5px]">
          <Row label="Available" value={`$${fmtUSD(available)}`} />
          <Row label="Network fee" value={`-$${fee.toFixed(2)}`} />
          <Row label="You'll receive" value={`$${fmtUSD(netReceive)}`} highlight />
        </div>
        {error && <p className="mt-2 text-[11px] text-rose-400">{error}</p>}
      </div>

      {/* Address / account */}
      <div>
        <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {isBank ? "Your bank account number" : "Destination wallet address"}
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={isBank ? "1234567890" : "0x… / TXxx…"}
          className="mt-1.5 w-full h-12 rounded-xl bg-background/40 border border-border/60 px-3.5 text-[13px] font-mono outline-none focus:border-gold transition"
        />
        {isBank && method.account_name && (
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
            Account holder name must match your verified profile.
          </p>
        )}
      </div>

      {method.instructions && (
        <div className="flex gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
          <Info className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/80">{method.instructions}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Step 4 -------------------------------- */

function StepReview({
  country, method, amount, address, note, setNote, fee, netReceive,
}: {
  country: Country; method: Method; amount: number; address: string;
  note: string; setNote: (s: string) => void; fee: number; netReceive: number;
}) {
  const isBank = method.method_type === "bank";
  const title = method.display_name || (isBank ? (method.bank_name || method.network) : method.network);
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-[15px] font-semibold">Review & confirm</h4>
        <p className="text-[12px] text-muted-foreground mt-1">Double-check before submitting.</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/30 divide-y divide-border/40">
        <SummaryRow label="Country" value={`${country.flag_emoji ?? ""} ${country.name}`} />
        <SummaryRow label="Method" value={title} />
        <SummaryRow label={isBank ? "Account number" : "Address"} value={address} mono />
        <SummaryRow label="Amount" value={`$${fmtUSD(amount)}`} />
        <SummaryRow label="Network fee" value={`$${fee.toFixed(2)}`} />
        <SummaryRow label="You'll receive" value={`$${fmtUSD(netReceive)}`} bold />
      </div>

      <div>
        <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          Note <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Add a note for our review team…"
          className="mt-1.5 w-full rounded-xl bg-background/40 border border-border/60 px-3.5 py-2.5 text-[13px] outline-none focus:border-gold transition resize-none"
        />
        <div className="mt-1 text-right text-[10px] text-muted-foreground tabular-nums">{note.length}/280</div>
      </div>
    </div>
  );
}

/* ---------------------------------- bits --------------------------------- */

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${highlight ? "text-gold font-semibold" : "text-foreground font-medium"}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right text-[13px] ${mono ? "font-mono text-[11.5px] break-all" : ""} ${bold ? "font-semibold text-gold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
