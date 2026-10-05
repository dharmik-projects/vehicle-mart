"use client";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue?: string;
  centerLabel?: string;
  emptyLabel?: string;
}

/**
 * Responsive donut chart for status / category distribution.
 * Shows an empty state when every segment is zero — no fake slices.
 */
export function DonutChart({ segments, centerValue, centerLabel, emptyLabel = "No data available yet" }: DonutChartProps) {
  const rows = segments.filter((s) => s.value > 0);
  const total = rows.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const r = 56;
  const stroke = 20;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label={centerLabel || "Distribution chart"}>
        <g transform="rotate(-90 80 80)">
          {rows.map((s) => {
            const len = (s.value / total) * c;
            const gap = len > 4 ? 2 : 0;
            const dash = `${Math.max(len - gap, 0.5)} ${c - Math.max(len - gap, 0.5)}`;
            const el = (
              <circle
                key={s.label}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" style={{ fill: "hsl(var(--foreground))", fontSize: 22, fontWeight: 700 }}>
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text x="80" y="96" textAnchor="middle" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}>
            {centerLabel}
          </text>
        )}
      </svg>

      <div className="w-full min-w-0 flex-1 space-y-2">
        {rows.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-foreground">{s.label}</span>
            <span className="shrink-0 font-semibold text-foreground tabular-nums">{s.value}</span>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
