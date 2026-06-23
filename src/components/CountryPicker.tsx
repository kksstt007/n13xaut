import * as React from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/countries-list";
import { cn } from "@/lib/utils";

type Props = {
  value: Country;
  onChange: (c: Country) => void;
  /** When true, show "(+dial)" next to the name — useful on the phone tab */
  showDial?: boolean;
  className?: string;
};

/** Bybit-style country picker — flag + name, opens a searchable sheet. */
export function CountryPicker({ value, onChange, showDial, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const list = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.code.toLowerCase().includes(needle) ||
        c.dial.includes(needle.replace(/\D/g, "")),
    );
  }, [q]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg bg-input border border-border px-4 py-3 text-sm hover:border-gold/60 transition",
          className,
        )}
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg leading-none">{value.flag}</span>
          <span className="truncate">{value.name}</span>
          {showDial && (
            <span className="text-muted-foreground">+{value.dial}</span>
          )}
        </span>
        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-md bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <div className="text-sm font-semibold mb-3">Select country / region</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search country or code"
                  className="w-full rounded-lg bg-input border border-border pl-9 pr-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="overflow-y-auto py-1">
              {list.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matches
                </div>
              )}
              {list.map((c) => {
                const active = c.code === value.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-input/60 transition text-left",
                      active && "bg-input/40",
                    )}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground">+{c.dial}</span>
                    {active && <Check className="size-4 text-gold" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
