"use client";
import { useLayoutEffect, useRef, useState } from "react";

export interface TrendPoint {
  /** x-axis / tooltip label (e.g. "Oct 3" or "Oct 2026") */
  label: string;
  value: number;
  /** optional tooltip text; defaults to the formatted value */
  tip?: string;
}

interface TrendChartProps {
  points: TrendPoint[];
  valueFormat?: (n: number) => string;
  color?: string;
  height?: number;
}

const mutedFill = { fill: "hsl(var(--muted-foreground))" };

/**
 * Responsive line + area trend chart drawn from real data points.
 * Shows "No data available yet" when every value is zero / no points exist —
 * it never invents values.
 */
export function TrendChart({
  points,
  valueFormat = (n: number) => String(n),
  color = "hsl(var(--primary))",
  height = 200,
}: TrendChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasData = points.some((p) => p.value > 0);

  if (!hasData) {
    return (
      <div ref={wrapRef} className="relative flex w-full flex-col items-center justify-center gap-2 py-10 text-center" style={{ minHeight: height }}>
        <p className="text-sm text-muted-foreground">No data available yet</p>
      </div>
    );
  }

  const w = Math.max(width, 0);
  const h = height;
  const padL = 6;
  const padR = 6;
  const padT = 16;
  const padB = 22;
  const maxVal = Math.max(...points.map((p) => p.value), 1);

  const xAt = (i: number) =>
    points.length <= 1 ? w / 2 : padL + (i * (w - padL - padR)) / (points.length - 1);
  const yAt = (v: number) => padT + (1 - v / maxVal) * (h - padT - padB);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L${xAt(points.length - 1).toFixed(1)},${(h - padB).toFixed(1)} L${xAt(0).toFixed(1)},${(h - padB).toFixed(1)} Z`
      : "";

  // Up to ~6 evenly spaced x labels so long periods stay readable.
  const step = Math.max(1, Math.ceil((points.length - 1) / 5));
  const labelIdx = points
    .map((_, i) => i)
    .filter((i) => i % step === 0 || i === points.length - 1);

  const handleMove = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(xAt(i) - px);
      if (d < best) { best = d; nearest = i; }
    }
    setHover(nearest);
  };

  const hoverLeft = hover !== null ? Math.min(Math.max(xAt(hover), 64), Math.max(w - 64, 64)) : 0;
  const hoverTop = hover !== null ? Math.max(yAt(points[hover].value) - 44, 0) : 0;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: h }}>
      {w > 0 && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="block"
          onMouseMove={(e) => handleMove(e.clientX, e.currentTarget)}
          onMouseLeave={() => setHover(null)}
        >
          {/* baseline */}
          <line
            x1={padL}
            y1={h - padB}
            x2={w - padR}
            y2={h - padB}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
          {/* max guide */}
          <line
            x1={padL}
            y1={yAt(maxVal)}
            x2={w - padR}
            y2={yAt(maxVal)}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text x={padL} y={yAt(maxVal) - 5} style={{ ...mutedFill, fontSize: 10 }}>
            {valueFormat(maxVal)}
          </text>

          {areaPath && <path d={areaPath} fill={color} opacity={0.08} />}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {labelIdx.map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={h - 6}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              style={{ ...mutedFill, fontSize: 10 }}
            >
              {points[i].label}
            </text>
          ))}

          {hover !== null && (
            <circle
              cx={xAt(hover)}
              cy={yAt(points[hover].value)}
              r={4}
              fill="hsl(var(--background))"
              stroke={color}
              strokeWidth={2}
            />
          )}
        </svg>
      )}

      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-[var(--shadow-2)]"
          style={{ left: hoverLeft, top: hoverTop }}
        >
          <span className="text-muted-foreground">{points[hover].label} · </span>
          <span className="font-semibold text-foreground tabular-nums">
            {points[hover].tip ?? valueFormat(points[hover].value)}
          </span>
        </div>
      )}
    </div>
  );
}
