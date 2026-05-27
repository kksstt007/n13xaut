import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export function PriceChart({ data, up }: { data: { t: number; p: number }[]; up: boolean }) {
  const color = up ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
        <Tooltip
          contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
          formatter={(v: number) => [`$${v.toFixed(2)}`, "XAU/USDT"]}
        />
        <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill="url(#g)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
