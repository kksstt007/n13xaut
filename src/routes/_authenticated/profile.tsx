import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, ChevronRight, ChevronDown, ShieldCheck, KeyRound, Smartphone, Mail,
  Lock, Fingerprint, Bell, Globe, Languages, CreditCard, Users, Gift,
  LifeBuoy, FileText, LogOut, Pencil, Star, Monitor, ScanFace, X,
  History as HistoryIcon, Settings as SettingsIcon, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DepositWithdraw } from "@/components/DepositWithdraw";


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
    queryFn: async () => {
      const { data, error } = await (supabase.from("profiles_safe" as any).select("*").eq("id", user!.id).maybeSingle() as any);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallets").select("usdt_balance").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("kyc_submissions").select("status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: refCount } = useQuery({
    queryKey: ["ref-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
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
    <div className="space-y-4 pb-6">
      {/* Profile identity — compact, premium fintech */}
      <section className="rounded-xl border border-[#D4AF37]/15 bg-[#0F0F0F]">
        <div className="flex items-center gap-3 p-4">
          <div className="relative shrink-0">
            <div className="size-11 rounded-full grid place-items-center text-sm font-semibold bg-[#141414] text-foreground border border-[#D4AF37]/20">
              {initials}
            </div>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
              className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-[#1a1a1a] border border-white/8 grid place-items-center hover:bg-[#222] transition"
            >
              <Pencil className="size-2" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold truncate text-foreground">
                {profile?.display_name || user?.email?.split("@")[0] || "Trader"}
              </h1>
              {kycVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[#D4AF37] bg-[#D4AF37]/8 border border-[#D4AF37]/20 rounded px-1 py-0.5 tracking-wide">
                  <ShieldCheck className="size-2.5" />
                  Verified
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-mono tracking-wider">UID {uid}</span>
              <button
                onClick={async () => { await navigator.clipboard.writeText(uid); toast.success("UID copied"); }}
                className="hover:text-foreground transition"
                aria-label="Copy UID"
              >
                <Copy className="size-2.5" />
              </button>
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium tracking-[0.1em] uppercase text-[#C4A055] border border-[#D4AF37]/15 rounded-sm px-1.5 py-[2px] bg-[#D4AF37]/[0.03]">
              <Star className="size-2 fill-current" />
              Premium
            </div>
          </div>
        </div>
      </section>

      {/* Premium Deposit & Withdrawal — rich card */}
      <section>
        <DepositWithdraw />
      </section>

      {/* Deposit & Withdrawal records */}
      <RecordsSection userId={user?.id} />

      {/* Shortcut grid */}
      <section className="grid grid-cols-3 gap-2">
        <Shortcut to="/history" icon={HistoryIcon} label="Orders" />
        <Shortcut to="/referrals" icon={Gift} label="Rewards" />
        <Shortcut to="/support" icon={LifeBuoy} label="Support" />
      </section>


      {/* Security center — collapsible */}
      <CollapsibleSection
        title="Security"
        subtitle="Protect your account"
        icon={Shield}
        defaultOpen={false}
      >
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
      </CollapsibleSection>

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
      <SectionCard title="Account" subtitle="API & invites">
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

function RecordsSection({ userId }: { userId?: string }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"deposits" | "withdrawals">("deposits");
  const { data: deposits } = useQuery({
    queryKey: ["profile-deposits", userId],
    queryFn: async () => (await supabase.from("deposits").select("*").eq("user_id", userId!).order("created_at", { ascending: false }).limit(10)).data ?? [],
    enabled: !!userId,
    staleTime: 30_000,
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["profile-withdrawals", userId],
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", userId!).order("created_at", { ascending: false }).limit(10)).data ?? [],
    enabled: !!userId,
    staleTime: 30_000,
  });

  const rows = tab === "deposits" ? deposits ?? [] : withdrawals ?? [];

  const statusCls = (s?: string) => {
    if (s === "approved" || s === "completed") return "text-success bg-success/10 border-success/20";
    if (s === "pending" || s === "processing") return "text-gold bg-gold/10 border-gold/20";
    if (s === "rejected" || s === "failed") return "text-destructive bg-destructive/10 border-destructive/20";
    return "text-muted-foreground bg-background/60 border-border";
  };

  return (
    <section>
      <div className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-elevated active:bg-surface-elevated/70 transition"
          aria-expanded={open}
        >
          <div className="size-9 rounded-xl grid place-items-center bg-gold/10 text-gold">
            <HistoryIcon className="size-[17px]" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold tracking-wide">Deposit & Withdrawal Records</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">Tap to view your recent transactions</div>
          </div>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="records-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/50">
                <div className="flex border-b border-border/50">
                  {(["deposits", "withdrawals"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-[12px] font-medium capitalize transition ${tab === t ? "text-gold border-b-2 border-gold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-border/40">
                  {rows.length === 0 && (
                    <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">No {tab} yet</div>
                  )}
                  {rows.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {tab === "deposits" ? "+" : "−"}${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10.5px] text-muted-foreground mt-0.5">
                          {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {r.network ? ` · ${r.network}` : ""}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border capitalize ${statusCls(r.status)}`}>{r.status ?? "pending"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}


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

function CollapsibleSection({
  title, subtitle, icon: Icon, defaultOpen = false, children,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section>
      <div className="rounded-2xl bg-surface border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-elevated active:bg-surface-elevated/70 transition"
          aria-expanded={open}
        >
          {Icon && (
            <div className="size-9 rounded-xl grid place-items-center bg-gold/10 text-gold">
              <Icon className="size-[17px]" />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold tracking-wide">{title}</div>
            {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
          </div>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/50">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
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
