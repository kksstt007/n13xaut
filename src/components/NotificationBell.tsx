import * as React from "react";
import { Bell, X, CheckCheck, Inbox, Info, CheckCircle2, AlertTriangle, ShieldAlert, Gift } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Link } from "@tanstack/react-router";

function typeMeta(t: string) {
  switch (t) {
    case "success": return { Icon: CheckCircle2, cls: "text-success bg-success/10 border-success/20" };
    case "warning": return { Icon: AlertTriangle, cls: "text-gold bg-gold/10 border-gold/20" };
    case "alert":   return { Icon: ShieldAlert, cls: "text-destructive bg-destructive/10 border-destructive/20" };
    case "promo":   return { Icon: Gift, cls: "text-gold bg-gold/10 border-gold/20" };
    default:         return { Icon: Info, cls: "text-foreground bg-surface-elevated border-border/60" };
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
  const { items, unreadCount, markAllRead, markRead } = useNotifications();

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
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-surface border-t border-border/60 flex flex-col"
              style={{ maxHeight: "85vh", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg grid place-items-center glass-gold">
                    <Bell className="size-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-semibold leading-tight">Notifications</h3>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      disabled={markAllRead.isPending}
                      className="flex items-center gap-1 text-[11px] font-medium text-gold hover:text-gold-soft px-2 py-1.5 rounded-md hover:bg-gold/10 transition disabled:opacity-50"
                    >
                      <CheckCheck className="size-3.5" /> Mark all
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="size-8 grid place-items-center rounded-full hover:bg-surface-elevated"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto scrollbar-thin flex-1">
                {items.length === 0 ? (
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
                      <NotificationRow key={n.id} n={n} onRead={() => markRead.mutate(n.id)} onClose={() => setOpen(false)} />
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

function NotificationRow({ n, onRead, onClose }: { n: Notification; onRead: () => void; onClose: () => void }) {
  const { Icon, cls } = typeMeta(n.type);
  const unread = !n.read_at;

  const content = (
    <div
      className={`flex gap-3 px-5 py-3.5 transition cursor-pointer ${unread ? "bg-gold/[0.025]" : ""} hover:bg-surface-elevated/60`}
      onClick={() => { if (unread) onRead(); if (n.link) onClose(); }}
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
          <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">{n.body}</p>
        )}
        <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 tabular-nums">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <li>
        <Link to={n.link as any}>{content}</Link>
      </li>
    );
  }
  return <li>{content}</li>;
}
