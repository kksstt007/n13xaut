import * as React from "react";
import { Bell, X, CheckCheck, Inbox, Info, CheckCircle2, AlertTriangle, ShieldAlert, Gift, Trash2, ChevronLeft, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Link } from "@tanstack/react-router";

function typeMeta(t: string) {
  switch (t) {
    case "success": return { Icon: CheckCircle2, cls: "text-success bg-success/10 border-success/20", label: "Success" };
    case "warning": return { Icon: AlertTriangle, cls: "text-gold bg-gold/10 border-gold/20", label: "Warning" };
    case "alert":   return { Icon: ShieldAlert, cls: "text-destructive bg-destructive/10 border-destructive/20", label: "Alert" };
    case "promo":   return { Icon: Gift, cls: "text-gold bg-gold/10 border-gold/20", label: "Promo" };
    default:         return { Icon: Info, cls: "text-foreground bg-surface-elevated border-border/60", label: "Info" };
  }
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<Notification | null>(null);
  const { items, unreadCount, markAllRead, markRead, remove } = useNotifications();

  const openDetail = (n: Notification) => {
    setActive(n);
    if (!n.read_at) markRead.mutate(n.id);
  };

  const onDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => {
        toast.success("Notification deleted");
        setActive(null);
      },
      onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className={`relative size-10 rounded-full grid place-items-center bg-surface border border-border/60 hover:border-gold/40 hover:bg-surface-elevated transition ${className}`}
      >
        <Bell className="size-[18px] text-foreground/85" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center text-primary-foreground tabular-nums border border-background"
            style={{ background: "linear-gradient(135deg,#E8C657 0%,#B8862F 100%)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setOpen(false); setActive(null); }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-surface border-t border-border/60 flex flex-col overflow-hidden"
              style={{ maxHeight: "85vh", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  {active ? (
                    <button
                      onClick={() => setActive(null)}
                      className="size-8 grid place-items-center rounded-full hover:bg-surface-elevated -ml-1.5"
                      aria-label="Back"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  ) : (
                    <div className="size-8 rounded-lg grid place-items-center glass-gold">
                      <Bell className="size-4 text-gold" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] font-semibold leading-tight truncate">
                      {active ? "Details" : "Notifications"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                      {active
                        ? new Date(active.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                        : unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!active && unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      disabled={markAllRead.isPending}
                      className="flex items-center gap-1 text-[11px] font-medium text-gold hover:text-gold-soft px-2 py-1.5 rounded-md hover:bg-gold/10 transition disabled:opacity-50"
                    >
                      <CheckCheck className="size-3.5" /> Mark all
                    </button>
                  )}
                  {active && (
                    <button
                      onClick={() => onDelete(active.id)}
                      disabled={remove.isPending}
                      className="flex items-center gap-1 text-[11px] font-medium text-destructive hover:text-destructive/80 px-2 py-1.5 rounded-md hover:bg-destructive/10 transition disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); setActive(null); }}
                    className="size-8 grid place-items-center rounded-full hover:bg-surface-elevated"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto scrollbar-thin flex-1">
                {active ? (
                  <DetailView n={active} onClose={() => { setOpen(false); setActive(null); }} />
                ) : items.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="size-12 mx-auto rounded-full grid place-items-center bg-surface-elevated border border-border/60 mb-3">
                      <Inbox className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[13px] font-medium text-foreground">No notifications yet</p>
                    <p className="text-[11.5px] text-muted-foreground mt-1">Updates from our team will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        onOpen={() => openDetail(n)}
                        onDelete={() => onDelete(n.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NotificationRow({ n, onOpen, onDelete }: { n: Notification; onOpen: () => void; onDelete: () => void }) {
  const { Icon, cls } = typeMeta(n.type);
  const unread = !n.read_at;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        className={`group flex gap-3 px-5 py-3.5 transition cursor-pointer ${unread ? "bg-gold/[0.025]" : ""} hover:bg-surface-elevated/60`}
      >
        <div className={`size-9 shrink-0 rounded-xl grid place-items-center border ${cls}`}>
          <Icon className="size-[15px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={`text-[13px] leading-snug flex-1 min-w-0 ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
              {n.title}
            </p>
            {unread && <span className="mt-1 size-1.5 rounded-full bg-gold shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />}
          </div>
          {n.body && (
            <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{n.body}</p>
          )}
          <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 tabular-nums">{timeAgo(n.created_at)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete notification"
          className="self-start size-8 rounded-full grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function DetailView({ n, onClose }: { n: Notification; onClose: () => void }) {
  const { Icon, cls, label } = typeMeta(n.type);
  return (
    <div className="px-5 py-5">
      <div className="flex items-center gap-2.5">
        <div className={`size-10 rounded-xl grid place-items-center border ${cls}`}>
          <Icon className="size-[17px]" />
        </div>
        <span className={`text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${cls}`}>
          {label}
        </span>
      </div>
      <h2 className="mt-3 font-display text-[18px] font-semibold leading-snug text-foreground break-words">
        {n.title}
      </h2>
      <p className="mt-1 text-[11.5px] text-muted-foreground tabular-nums">
        {new Date(n.created_at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
      </p>

      {n.body ? (
        <div className="mt-4 rounded-xl bg-surface-elevated/50 border border-border/40 px-4 py-3.5">
          <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {n.body}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[12.5px] text-muted-foreground italic">No additional details.</p>
      )}

      {n.link && (
        <Link
          to={n.link as any}
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold hover:text-gold-soft"
        >
          Open link <ExternalLink className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
