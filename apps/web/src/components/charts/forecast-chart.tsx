"use client";

import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ForecastChart({
  series,
  totalBudget,
  format,
}: {
  series: { day: number; actual: number | null; projected: number | null }[];
  totalBudget: number;
  format: (paise: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="spent-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} interval={4} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={52}
          tickFormatter={(v: number) => `₹${v >= 100_000 ? `${Math.round(v / 100_000)}k` : Math.round(v / 100)}`}
        />
        <Tooltip
          formatter={(v) => format(Number(v))}
          labelFormatter={(d) => `Day ${d}`}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
        />
        {totalBudget > 0 && (
          <ReferenceLine
            y={totalBudget}
            stroke="var(--chart-3)"
            strokeDasharray="4 4"
            label={{ value: "Budgets", position: "insideTopLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
          />
        )}
        <Area type="monotone" dataKey="actual" name="Spent" stroke="var(--chart-1)" strokeWidth={2} fill="url(#spent-fill)" isAnimationActive={false} />
        <Line type="monotone" dataKey="projected" name="Forecast" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
