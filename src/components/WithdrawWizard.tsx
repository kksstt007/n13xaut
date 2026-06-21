import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, ArrowLeft, ShieldCheck, Info, Globe2, Building2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtUSD } from "@/lib/format";

type Step = 1 | 2 | 3 | 4;

export function WithdrawWizard({
  open, onClose, available,
}: { open: boolean; onClose: () => void; available: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = React.useState<Step>(1);
  const [country, setCountry] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep(1); setCountry(""); setBankName(""); setAccountName("");
      setAccountNumber(""); setAmount(""); setNote("");
    }
  }, [open]);

  const amountNum = Number(amount) || 0;
  const fee = 0;
  const netReceive = Math.max(0, amountNum - fee);
  const amountError =
    amountNum <= 0 ? "Enter an amount"
    : amountNum > available ? "Exceeds available balance"
    : null;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (amountError) throw new Error(amountError);
      const payload: any = {
        user_id: user.id,
        network: "BANK",
        address: accountNumber.trim(),
        amount: amountNum,
        country: country.trim(),
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        user_note: note.trim() || null,
      };
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
    (step === 1 && country.trim().length >= 2) ||
    (step === 2 && bankName.trim().length >= 2) ||
    (step === 3 && accountName.trim().length >= 2 && accountNumber.trim().length >= 4 && !amountError) ||
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
            <div className="px-5 pt-4 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <button onClick={goBack} className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated -ml-2" aria-label="Back">
                  <ArrowLeft className="size-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-display text-[15px] font-semibold leading-tight">Withdraw funds</h3>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    Step {step} of 4 · Available ${fmtUSD(available)}
                  </p>
                </div>
                <button onClick={onClose} className="size-9 grid place-items-center rounded-full hover:bg-surface-elevated -mr-2" aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-[3px] flex-1 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-border"}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  {step === 1 && (
                    <Section icon={<Globe2 className="size-4" />} title="Which country?" hint="Type the country your bank operates in.">
                      <Field
                        label="Country name" autoFocus
                        value={country} onChange={setCountry}
                        placeholder="e.g. Myanmar, Thailand, Singapore"
                      />
                    </Section>
                  )}

                  {step === 2 && (
                    <Section icon={<Building2 className="size-4" />} title="Which bank?" hint="Enter the full name of the receiving bank.">
                      <Field
                        label="Bank name" autoFocus
                        value={bankName} onChange={setBankName}
                        placeholder="e.g. KBZ Bank, AYA Bank, Bangkok Bank"
                      />
                    </Section>
                  )}

                  {step === 3 && (
                    <Section icon={<Wallet className="size-4" />} title="Account & amount" hint="Enter your bank account details and the amount to withdraw.">
                      <Field
                        label="Account holder name" autoFocus
                        value={accountName} onChange={setAccountName}
                        placeholder="Full name as on bank account"
                      />
                      <Field
                        label="Account number"
                        value={accountNumber} onChange={setAccountNumber}
                        placeholder="Bank account / IBAN" mono
                      />

                      <div className="rounded-2xl border border-border/60 bg-background/30 p-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">You withdraw</span>
                          <button onClick={() => setAmount(String(available))} className="text-[11px] font-semibold text-gold">MAX</button>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-[22px] font-semibold text-muted-foreground">$</span>
                          <input
                            inputMode="decimal" value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-[32px] font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40 min-w-0"
                          />
                          <span className="text-[12px] font-medium text-muted-foreground">USDT</span>
                        </div>
                        <div className="mt-3 flex gap-1.5">
                          {[25, 50, 75, 100].map((p) => (
                            <button key={p} onClick={() => setAmount((Math.floor(available * p) / 100).toString())}
                              className="flex-1 h-8 rounded-lg border border-border/60 text-[11px] font-medium text-muted-foreground hover:border-gold hover:text-gold transition">
                              {p}%
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11.5px]">
                          <span className="text-muted-foreground">Available</span>
                          <span className="tabular-nums font-medium">${fmtUSD(available)}</span>
                        </div>
                        {amountError && <p className="mt-2 text-[11px] text-rose-400">{amountError}</p>}
                      </div>
                    </Section>
                  )}

                  {step === 4 && (
                    <Section icon={<ShieldCheck className="size-4" />} title="Review & confirm" hint="Please double-check every detail.">
                      <div className="rounded-2xl border border-border/60 bg-background/30 divide-y divide-border/40">
                        <SummaryRow label="Country" value={country} />
                        <SummaryRow label="Bank" value={bankName} />
                        <SummaryRow label="Account name" value={accountName} />
                        <SummaryRow label="Account number" value={accountNumber} mono />
                        <SummaryRow label="Amount" value={`$${fmtUSD(amountNum)} USDT`} bold />
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

                      <div className="flex gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
                        <Info className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-200/80">
                          Make sure the account holder name matches your verified profile to avoid rejection.
                        </p>
                      </div>
                    </Section>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

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

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <>
      <div>
        <div className="inline-flex items-center gap-2 text-gold">
          {icon}
          <h4 className="text-[15px] font-semibold text-foreground">{title}</h4>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">{hint}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </>
  );
}

function Field({
  label, value, onChange, placeholder, autoFocus, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1.5 w-full h-12 rounded-xl bg-background/40 border border-border/60 px-3.5 text-[14px] outline-none focus:border-gold transition ${mono ? "font-mono text-[13px]" : ""}`}
      />
    </label>
  );
}

function SummaryRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right text-[13px] ${mono ? "font-mono text-[11.5px] break-all" : ""} ${bold ? "font-semibold text-gold" : "font-medium"}`}>
        {value || "—"}
      </span>
    </div>
  );
}
