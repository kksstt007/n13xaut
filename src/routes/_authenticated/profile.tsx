import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, ChevronRight, ShieldCheck, KeyRound, Smartphone, Mail,
  Lock, Fingerprint, Bell, Globe, Languages, CreditCard, Users, Gift,
  LifeBuoy, FileText, LogOut, Pencil, Star, Monitor, ScanFace, X,
  Wallet as WalletIcon, History as HistoryIcon, Settings as SettingsIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — XAUT.trade" }] }),
  component: ProfilePage,
});

/* ------------------------------- Page ------------------------------- */

function ProfilePage() {
  const { user, isAdmin, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("balance").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => (await supabase.from("kyc_submissions").select("status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: refCount } = useQuery({
    queryKey: ["ref-count", user?.id],
    queryFn: async () => (await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user!.id)).count ?? 0,
    enabled: !!user,
  });

  const [editOpen, setEditOpen] = React.useState(false);

  const uid = React.useMemo(() => (user?.id ?? "").replace(/-/g, "").slice(0, 10).toUpperCase(), [user?.id]);
  const initials = React.useMemo(() => {
    const n = (profile?.display_name || user?.email || "U").trim();
    return n.slice(0, 2).toUpperCase();
  }, [profile?.display_name, user?.email]);

  const kycVerified = kyc?.status === "approved";
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;

  return (
    <div className="space-y-5 pb-6">
      {/* Identity header */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.18_0.012_265)] to-[oklch(0.13_0.008_260)] p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.80 0.115 86 / 0.5), transparent 70%)" }}
        />
        <div className="relative flex items-start gap-4">
          <div className="relative">
            <div className="size-16 rounded-2xl grid place-items-center text-lg font-bold text-primary-foreground shadow-lg"
              style={{ background: "linear-gradient(135deg, #E8C657 0%, #B8862F 100%)" }}>
              {initials}
            </div>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
              className="absolute -bottom-1 -right-1 size-6 rounded-full bg-surface-elevated border border-border grid place-items-center hover:scale-105 transition"
            >
              <Pencil className="size-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-semibold truncate">
                {profile?.display_name || user?.email?.split("@")[0] || "Trader"}
              </h1>
              {kycVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 rounded-full px-1.5 py-0.5">
                  <ShieldCheck className="size-3" /> Verified
                </span>
              )}
            </div>
            <UidRow uid={uid} />
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                <Star className="size-3 fill-gold" /> VIP 0
              </span>
              {memberSince && (
                <span className="text-[11px] text-muted-foreground">
                  Member since {memberSince.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Stat label="Total balance" value={`$${Number(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent />
          <Stat label="KYC level" value={kycVerified ? "Level 2" : kyc?.status === "pending" ? "Pending" : "Level 0"} />
          <Stat label="Referrals" value={String(refCount ?? 0)} />
        </div>
      </section>

      {/* Shortcut grid */}
      <section className="grid grid-cols-4 gap-2">
        <Shortcut to="/wallet" icon={WalletIcon} label="Assets" />
        <Shortcut to="/history" icon={HistoryIcon} label="Orders" />
        <Shortcut to="/referrals" icon={Gift} label="Rewards" />
        <Shortcut to="/support" icon={LifeBuoy} label="Support" />
      </section>

      {/* Security center */}
      <SectionCard title="Security" subtitle="Protect your account">
        <Row
          icon={Mail}
          label="Email"
          value={user?.email}
          status={user?.email_confirmed_at ? "verified" : "unverified"}
        />
        <Row
          icon={Smartphone}
          label="Phone number"
          value={profile?.phone || "Not set"}
          status={profile?.phone ? "verified" : "off"}
          onClick={() => setEditOpen(true)}
        />
        <Row icon={Lock} label="Login password" hint="Last changed —" actionLabel="Change" onClick={() => toast.info("Password reset link will be sent to your email")} />
        <Row icon={Fingerprint} label="Two-factor (2FA)" hint="Authenticator app" status="off" actionLabel="Enable" onClick={() => toast.info("2FA setup coming soon")} />
        <Row icon={KeyRound} label="Anti-phishing code" hint="Recognize official emails" actionLabel="Set" onClick={() => toast.info("Anti-phishing setup coming soon")} />
        <Row icon={Monitor} label="Devices & sessions" hint="Manage signed-in devices" onClick={() => toast.info("Session manager coming soon")} last />
      </SectionCard>

      {/* Verification */}
      <SectionCard title="Identity verification" subtitle="Increase limits and unlock features">
        <Row
          icon={ScanFace}
          label="Identity (KYC)"
          hint={
            kycVerified ? "Approved — full trading access"
            : kyc?.status === "pending" ? "Under review"
            : kyc?.status === "rejected" ? "Rejected — please resubmit"
            : "Not started"
          }
          status={kycVerified ? "verified" : kyc?.status === "pending" ? "pending" : "off"}
          to="/kyc"
          last
        />
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account" subtitle="Payments, API & invites">
        <Row icon={CreditCard} label="Payment methods" hint="Bank & crypto" to="/wallet" />
        <Row icon={Users} label="Referral program" hint={`${refCount ?? 0} invited`} to="/referrals" />
        <Row icon={KeyRound} label="API management" hint="Create API keys" onClick={() => toast.info("API management coming soon")} last />
      </SectionCard>

      {/* Preferences */}
      <SectionCard title="Preferences">
        <Row icon={Languages} label="Language" value="English" onClick={() => toast.info("Language switcher coming soon")} />
        <Row icon={Globe} label="Currency" value="USD" onClick={() => toast.info("Currency switcher coming soon")} />
        <Row icon={Bell} label="Notifications" hint="Push, email & in-app" onClick={() => toast.info("Notification settings coming soon")} last />
      </SectionCard>

      {/* Help & legal */}
      <SectionCard title="More">
        <Row icon={LifeBuoy} label="Help center" to="/support" />
        <Row icon={FileText} label="Terms & privacy" onClick={() => toast.info("Legal documents")} />
        {isAdmin && <Row icon={SettingsIcon} label="Admin panel" to="/admin" />}
        <Row icon={LogOut} label="Sign out" destructive onClick={signOut} last />
      </SectionCard>

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        XAUT.trade · v1.0 · {new Date().getFullYear()}
      </p>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={() => qc.invalidateQueries({ queryKey: ["profile", user?.id] })}
        userId={user?.id}
      />
    </div>
  );
}

/* ------------------------------ Pieces ------------------------------ */

function UidRow({ uid }: { uid: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(uid);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
    >
      <span className="font-mono tracking-wider">UID {uid}</span>
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
    </button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold truncate ${accent ? "text-gold" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface border border-border/60 py-3 px-2 hover:bg-surface-elevated active:scale-95 transition"
    >
      <div className="size-9 rounded-xl grid place-items-center bg-gold/10 text-gold">
        <Icon className="size-[18px]" />
      </div>
      <span className="text-[11px] font-medium text-foreground/90">{label}</span>
    </Link>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="px-1 mb-2">
        <h2 className="text-[13px] font-semibold tracking-wide text-foreground">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

type RowProps = {
  icon: any;
  label: string;
  value?: string | null;
  hint?: string;
  status?: "verified" | "pending" | "unverified" | "off";
  actionLabel?: string;
  destructive?: boolean;
  last?: boolean;
  to?: string;
  onClick?: () => void;
};

function Row({ icon: Icon, label, value, hint, status, actionLabel, destructive, last, to, onClick }: RowProps) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-border/50" : ""} ${(to || onClick) ? "hover:bg-surface-elevated active:bg-surface-elevated/70 transition" : ""}`}>
      <div className={`size-9 rounded-xl grid place-items-center ${destructive ? "bg-destructive/10 text-destructive" : "bg-background/60 text-muted-foreground"}`}>
        <Icon className="size-[17px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</div>
        {(hint || value) && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{value ?? hint}</div>}
      </div>
      {status && <StatusPill status={status} />}
      {actionLabel && <span className="text-[11px] font-semibold text-gold">{actionLabel}</span>}
      {(to || onClick) && !destructive && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>;
  return inner;
}

function StatusPill({ status }: { status: NonNullable<RowProps["status"]> }) {
  const map = {
    verified: { text: "Verified", cls: "text-success bg-success/10 border-success/20" },
    pending:  { text: "Pending",  cls: "text-gold bg-gold/10 border-gold/20" },
    unverified: { text: "Unverified", cls: "text-destructive bg-destructive/10 border-destructive/20" },
    off:      { text: "Off",      cls: "text-muted-foreground bg-background/60 border-border" },
  }[status];
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${map.cls}`}>{map.text}</span>;
}

/* ---------------------------- Edit sheet ---------------------------- */

function EditProfileSheet({
  open, onClose, profile, onSaved, userId,
}: {
  open: boolean; onClose: () => void; profile: any; onSaved: () => void; userId?: string;
}) {
  const [form, setForm] = React.useState({ display_name: "", phone: "", country: "" });
  React.useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name ?? "",
      phone: profile.phone ?? "",
      country: profile.country ?? "",
    });
  }, [profile, open]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-surface border-t border-border p-5 pb-8"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold">Edit profile</h3>
              <button onClick={onClose} className="size-8 grid place-items-center rounded-full hover:bg-surface-elevated">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Display name">
                <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="input" placeholder="Your name" />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" placeholder="Country" />
              </Field>
            </div>
            <button
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 active:scale-[0.99] transition"
              style={{ background: "linear-gradient(135deg, #E8C657 0%, #B8862F 100%)" }}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
            <style>{`.input{width:100%;border-radius:.75rem;background:var(--color-background);border:1px solid var(--color-border);padding:.75rem .875rem;font-size:.875rem;outline:none;color:var(--color-foreground)}.input:focus{border-color:var(--gold)}`}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
