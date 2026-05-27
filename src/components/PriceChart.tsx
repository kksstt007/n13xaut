import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export function PriceChart({ data, up }: { data: { t: number; p: number }[]; up: boolean }) {
  const color = up ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="60%" stopColor={color} stopOpacity={0.06} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
        <Tooltip
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "3 3" }}
          contentStyle={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            fontSize: 12,
            padding: "8px 10px",
            boxShadow: "var(--shadow-elevated)",
          }}
          labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
          formatter={(v: number) => [`$${v.toFixed(2)}`, "XAU/USDT"]}
        />
        <Area
          type="monotone"
          dataKey="p"
          stroke={color}
          strokeWidth={1.8}
          fill="url(#priceFill)"
          isAnimationActive={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-background)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
