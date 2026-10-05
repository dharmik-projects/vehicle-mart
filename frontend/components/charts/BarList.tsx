"use client";

export interface BarListItem {
  label: string;
  value: number;
  /** secondary line under the value (e.g. "12 units") */
  sub?: string;
}

interface BarListProps {
  items: BarListItem[];
  valueFormat?: (n: number) => string;
  emptyLabel?: string;
  maxRows?: number;
}

/**
 * Horizontal bar comparison list (real values only).
 * Renders an empty state instead of placeholder bars when there is no data.
 */
export function BarList({ items, valueFormat = (n: number) => String(n), emptyLabel = "No data available yet", maxRows }: BarListProps) {
  const rows = maxRows ? items.slice(0, maxRows) : items;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="relative overflow-hidden rounded-lg border border-border">
          <div
            className="absolute inset-y-0 left-0 bg-muted"
            style={{ width: `${Math.max((r.value / max) * 100, 1)}%` }}
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
            <p className="min-w-0 truncate text-sm font-medium text-foreground">{r.label}</p>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-foreground tabular-nums">{valueFormat(r.value)}</p>
              {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
