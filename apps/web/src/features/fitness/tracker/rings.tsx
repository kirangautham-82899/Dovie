"use client";

export type Ring = { label: string; value: number; goal: number; color: string };

/** Concentric activity rings. Progress past the goal shows as a full ring. */
export function ActivityRings({ rings, size = 220, stroke = 18, children }: {
  rings: Ring[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const gap = 4;
  const c = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap);
          const len = 2 * Math.PI * radius;
          const pct = r.goal > 0 ? Math.min(1, r.value / r.goal) : 0;
          return (
            <g key={r.label}>
              <circle cx={c} cy={c} r={radius} fill="none" stroke={r.color} strokeOpacity={0.16} strokeWidth={stroke} />
              <circle
                cx={c}
                cy={c}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - Math.max(pct, 0.002))}
                className="fit-ring-arc fit-ring-draw"
                style={{ "--ring-len": len, animationDelay: `${i * 120}ms` } as React.CSSProperties}
              />
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

/** A ring-coloured legend row. */
export function RingStat({ ring, unit, icon: Icon }: { ring: Ring; unit: string; icon: React.ComponentType<{ className?: string }> }) {
  const pct = ring.goal > 0 ? Math.round((ring.value / ring.goal) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${ring.color} 18%, transparent)`, color: ring.color }}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.64rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">{ring.label}</p>
        <p className="font-serif text-2xl leading-none tracking-tight tabular-nums">
          {Math.round(ring.value).toLocaleString("en-IN")}
          <span className="ml-1 font-sans text-xs text-muted-foreground">
            / {ring.goal.toLocaleString("en-IN")} {unit}
          </span>
        </p>
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: ring.color }}>
        {pct}%
      </span>
    </div>
  );
}
