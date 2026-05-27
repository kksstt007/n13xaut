import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — XAUT.trade" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
    enabled: !!user,
  });
  const [form, setForm] = React.useState({ display_name: "", phone: "", country: "" });
  React.useEffect(() => { if (profile) setForm({ display_name: profile.display_name ?? "", phone: profile.phone ?? "", country: profile.country ?? "" }); }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Profile updated"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass rounded-xl p-6 space-y-4">
        <Field label="Email"><input disabled value={user?.email ?? ""} className="input opacity-60" /></Field>
        <Field label="Display name"><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="input" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
        <Field label="Country"><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" /></Field>
        <button disabled={save.isPending} className="rounded-lg bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">Save</button>
      </form>
      <style>{`.input{width:100%;border-radius:.5rem;background:var(--color-input);border:1px solid var(--color-border);padding:.625rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--gold)}`}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
