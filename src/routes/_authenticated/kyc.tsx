import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({ meta: [{ title: "KYC — XAUT.trade" }] }),
  component: KycPage,
});

function KycPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => (await supabase.from("kyc_submissions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
    enabled: !!user,
  });

  const [form, setForm] = React.useState({ full_name: "", document_type: "passport", document_number: "" });
  const [front, setFront] = React.useState<File | null>(null);
  const [selfie, setSelfie] = React.useState<File | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      let frontUrl = null, selfieUrl = null;
      if (front) {
        const path = `${user!.id}/front-${Date.now()}-${front.name}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, front);
        if (error) throw error;
        frontUrl = path;
      }
      if (selfie) {
        const path = `${user!.id}/selfie-${Date.now()}-${selfie.name}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, selfie);
        if (error) throw error;
        selfieUrl = path;
      }
      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user!.id, ...form, document_front_url: frontUrl, selfie_url: selfieUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("KYC submitted for review"); qc.invalidateQueries({ queryKey: ["kyc"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Identity Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Required for withdrawals over $1,000 USDT.</p>
      </div>

      {existing && (
        <div className={`glass rounded-xl p-5 flex items-center gap-4 ${existing.status === "approved" ? "border-success/40" : existing.status === "rejected" ? "border-destructive/40" : "border-gold/40"}`}>
          <ShieldCheck className={`size-8 ${existing.status === "approved" ? "text-success" : existing.status === "rejected" ? "text-destructive" : "text-gold"}`} />
          <div>
            <div className="font-semibold">Status: <span className="capitalize">{existing.status}</span></div>
            {existing.rejection_reason && <p className="text-xs text-destructive mt-1">{existing.rejection_reason}</p>}
            <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(existing.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {(!existing || existing.status === "rejected") && (
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="glass rounded-xl p-6 space-y-4">
          <Field label="Full legal name"><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></Field>
          <Field label="Document type">
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input">
              <option value="passport">Passport</option><option value="id">National ID</option><option value="license">Driver's license</option>
            </select>
          </Field>
          <Field label="Document number"><input required value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="input" /></Field>
          <Field label="Document photo"><input required type="file" accept="image/*" onChange={(e) => setFront(e.target.files?.[0] ?? null)} className="input" /></Field>
          <Field label="Selfie with document"><input required type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} className="input" /></Field>
          <button disabled={submit.isPending} className="w-full rounded-lg bg-gradient-gold py-3 font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
            {submit.isPending ? "Uploading…" : "Submit for verification"}
          </button>
        </form>
      )}

      <style>{`.input{width:100%;border-radius:.5rem;background:var(--color-input);border:1px solid var(--color-border);padding:.625rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--gold)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
