import * as React from "react";

export type Candle = { t: number; o: number; h: number; l: number; c: number };

type Props = {
  data: Candle[];
  tfLabel?: string;
};

export function CandleChart({ data, tfLabel }: Props) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [hover, setHover] = React.useState<{ i: number; x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 12, right: 48, bottom: 22, left: 8 };
  const W = Math.max(0, size.w);
  const H = Math.max(0, size.h);
  const innerW = Math.max(0, W - padding.left - padding.right);
  const innerH = Math.max(0, H - padding.top - padding.bottom);

  const candles = data;
  const n = candles.length;
  const { min, max } = React.useMemo(() => {
    if (!n) return { min: 0, max: 1 };
    let mn = Infinity, mx = -Infinity;
    for (const c of candles) {
      if (c.l < mn) mn = c.l;
      if (c.h > mx) mx = c.h;
    }
    const pad = (mx - mn) * 0.08 || 1;
    return { min: mn - pad, max: mx + pad };
  }, [candles, n]);

  const yScale = (p: number) => padding.top + (1 - (p - min) / (max - min)) * innerH;
  const slot = n > 0 ? innerW / n : 0;
  const cw = Math.max(1.2, Math.min(14, slot * 0.66));

  // Y-axis ticks
  const ticks = React.useMemo(() => {
    const arr: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) arr.push(min + ((max - min) * i) / steps);
    return arr;
  }, [min, max]);

  // X-axis time labels (≈5 evenly spaced)
  const xTicks = React.useMemo(() => {
    if (n < 2) return [];
    const labels = 5;
    const out: { i: number; label: string }[] = [];
    for (let k = 0; k < labels; k++) {
      const i = Math.round((k * (n - 1)) / (labels - 1));
      const d = new Date(candles[i].t);
      const spanMs = candles[n - 1].t - candles[0].t;
      const isIntraday = spanMs <= 36 * 60 * 60 * 1000;
      const label = isIntraday
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
      out.push({ i, label });
    }
    return out;
  }, [candles, n]);

  const colorUp = "var(--color-success)";
  const colorDown = "var(--color-destructive)";

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!n) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = x - padding.left;
    const i = Math.max(0, Math.min(n - 1, Math.floor(rel / slot)));
    setHover({ i, x: padding.left + i * slot + slot / 2, y: e.clientY - rect.top });
  };

  const hovered = hover && candles[hover.i];

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      {W > 0 && H > 0 && n > 0 && (
        <svg
          width={W}
          height={H}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          className="block"
        >
          {/* Grid + Y axis */}
          {ticks.map((v, idx) => {
            const y = yScale(v);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  x2={W - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeOpacity={0.25}
                  strokeDasharray="3 4"
                />
                <text
                  x={W - padding.right + 6}
                  y={y + 3}
                  fontSize={9}
                  fill="var(--color-muted-foreground)"
                  fontFamily="var(--font-mono, ui-monospace)"
                >
                  ${v.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {xTicks.map((t, idx) => {
            const x = padding.left + t.i * slot + slot / 2;
            return (
              <text
                key={idx}
                x={x}
                y={H - 6}
                fontSize={9}
                textAnchor="middle"
                fill="var(--color-muted-foreground)"
              >
                {t.label}
              </text>
            );
          })}

          {/* Candles */}
          {candles.map((c, i) => {
            const x = padding.left + i * slot + slot / 2;
            const up = c.c >= c.o;
            const color = up ? colorUp : colorDown;
            const yO = yScale(c.o);
            const yC = yScale(c.c);
            const yH = yScale(c.h);
            const yL = yScale(c.l);
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(1, Math.abs(yC - yO));
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={yH} y2={yL} stroke={color} strokeWidth={1} />
                <rect
                  x={x - cw / 2}
                  y={bodyTop}
                  width={cw}
                  height={bodyH}
                  fill={color}
                  rx={0.6}
                />
              </g>
            );
          })}

          {/* Last price line */}
          {(() => {
            const last = candles[n - 1];
            const y = yScale(last.c);
            const up = last.c >= last.o;
            const color = up ? colorUp : colorDown;
            return (
              <g>
                <line
                  x1={padding.left}
                  x2={W - padding.right}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeDasharray="2 3"
                  strokeWidth={1}
                />
                <rect
                  x={W - padding.right + 2}
                  y={y - 8}
                  width={44}
                  height={16}
                  fill={color}
                  rx={3}
                />
                <text
                  x={W - padding.right + 24}
                  y={y + 3}
                  fontSize={9}
                  textAnchor="middle"
                  fill="var(--color-background)"
                  fontWeight={700}
                >
                  ${last.c.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {/* Crosshair */}
          {hover && hovered && (
            <g>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={padding.top}
                y2={H - padding.bottom}
                stroke="var(--color-muted-foreground)"
                strokeOpacity={0.4}
                strokeDasharray="2 3"
              />
            </g>
          )}
        </svg>
      )}

      {/* Tooltip */}
      {hover && hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border/60 bg-surface-elevated px-2.5 py-1.5 text-[10px] shadow-elevated"
          style={{
            left: Math.min(Math.max(hover.x + 8, 8), W - 150),
            top: 8,
          }}
        >
          <div className="text-muted-foreground mb-1 tracking-wide">
            {new Date(hovered.t).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 num font-semibold">
            <span className="text-muted-foreground font-normal">O</span>
            <span>${hovered.o.toFixed(2)}</span>
            <span className="text-muted-foreground font-normal">H</span>
            <span className="text-success">${hovered.h.toFixed(2)}</span>
            <span className="text-muted-foreground font-normal">L</span>
            <span className="text-destructive">${hovered.l.toFixed(2)}</span>
            <span className="text-muted-foreground font-normal">C</span>
            <span className={hovered.c >= hovered.o ? "text-success" : "text-destructive"}>
              ${hovered.c.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {n === 0 && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
          Loading {tfLabel ?? ""} candles…
        </div>
      )}
    </div>
  );
}
