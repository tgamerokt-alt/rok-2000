"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/*
 * Small hand-rolled SVG charts (no chart library). Colors come from the
 * `.viz-root` CSS variables in globals.css (validated for CVD + contrast on
 * the card surfaces in both themes), so every chart must sit inside an
 * element with the `viz-root` class — ChartCard provides it.
 *
 * Marks follow one spec: bars <= 24px thick with a 4px rounded data-end and a
 * square baseline, 2px lines, >= 8px dots with a 2px surface ring, solid
 * hairline grid. Every chart has a hover tooltip; values stay reachable
 * without it via direct labels or the dashboard's table.
 */

export function fmtCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

export function fmtPct(fraction: number, digits = 0) {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Approximate rendered width in characters: Thai vowel/tone marks stack on the base letter and take no width. */
function visualLength(text: string) {
  return text.replace(/[ัิ-ฺ็-๎]/g, "").length;
}

/** Truncate to a visual length, never splitting a base letter from its marks. */
function truncateVisual(text: string, max: number) {
  if (visualLength(text) <= max) return text;
  let out = "";
  for (const ch of text) {
    if (visualLength(out + ch) > max - 1) break;
    out += ch;
  }
  return `${out}…`;
}

/** Clean axis ticks from 0 to a rounded-up max. */
function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Horizontal bar growing right from x, rounded only at the data end. */
function hBarPath(x: number, y: number, len: number, h: number) {
  if (len <= 0) return "";
  const r = Math.min(4, len, h / 2);
  return `M${x},${y}h${len - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(len - r)}Z`;
}

/** Vertical bar growing up from yBase, rounded only at the data end. */
function vBarPath(x: number, yBase: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${yBase}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}Z`;
}

const AXIS_TEXT = { fill: "var(--viz-text-muted)", fontSize: 11 } as const;

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

function Tooltip({ state, width }: { state: TooltipState | null; width: number }) {
  if (!state) return null;
  const flip = state.x > width - 200;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40"
      style={{
        left: flip ? undefined : state.x + 14,
        right: flip ? width - state.x + 14 : undefined,
        top: Math.max(0, state.y - 12),
      }}
    >
      {state.content}
    </div>
  );
}

/** A tooltip row: value first (strong), label after (muted), keyed with a short line in the mark's color. */
export function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {color && <span className="inline-block h-0.5 w-3 rounded" style={{ background: color }} />}
      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

export function TipTitle({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{children}</div>;
}

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: { color: string; label: string; shape?: "dot" | "rect" | "line" }[];
  children: ReactNode;
}) {
  return (
    <section className="viz-root rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/20">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {legend && legend.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span
                className={
                  l.shape === "line"
                    ? "inline-block h-0.5 w-4 rounded"
                    : l.shape === "rect"
                      ? "inline-block h-2.5 w-2.5 rounded-sm"
                      : "inline-block h-2.5 w-2.5 rounded-full"
                }
                style={{ background: l.color }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bar list (ranked items)
// ---------------------------------------------------------------------------

export interface BarItem {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  /** De-emphasized (gray) — for context rows next to the one that matters. */
  muted?: boolean;
  tooltip: ReactNode;
}

export function HBarChart({ items }: { items: BarItem[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const rowH = 26;
  const barH = 16;
  // Size the label column to the longest label (~7px/char at 11px), capped so bars keep room.
  const longest = Math.max(...items.map((i) => visualLength(i.label)), 4);
  const labelW = Math.min(width * 0.38, 140, Math.max(48, longest * 7 + 12));
  const valueW = 64;
  const plotW = Math.max(10, width - labelW - valueW);
  const max = Math.max(...items.map((i) => i.value), 1);
  const height = items.length * rowH;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => (setTip(null), setHovered(null))}>
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {items.map((item, i) => {
            const y = i * rowH;
            const len = (Math.max(0, item.value) / max) * plotW;
            // truncate rather than let text spill past the left edge
            const label = truncateVisual(item.label, Math.max(4, Math.floor((labelW - 10) / 7)));
            const active = hovered === item.key;
            return (
              <g
                key={item.key}
                onPointerMove={(e) => {
                  const box = ref.current!.getBoundingClientRect();
                  setHovered(item.key);
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content: item.tooltip });
                }}
              >
                {/* hit target: the whole row, not just the painted bar */}
                <rect x={0} y={y} width={width} height={rowH} fill="transparent" />
                <text x={labelW - 8} y={y + rowH / 2} dy="0.35em" textAnchor="end" {...AXIS_TEXT} fill="var(--viz-text)">
                  {label}
                </text>
                <path
                  d={hBarPath(labelW, y + (rowH - barH) / 2, len, barH)}
                  fill={item.muted ? "var(--viz-muted-mark)" : "var(--viz-series-1)"}
                  opacity={hovered && !active ? 0.55 : 1}
                />
                <text x={labelW + len + 6} y={y + rowH / 2} dy="0.35em" {...AXIS_TEXT} className="tabular-nums">
                  {item.valueLabel}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip state={tip} width={width} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column chart (ordered categories: brackets, histogram bins)
// ---------------------------------------------------------------------------

export interface ColumnItem {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  tone?: "positive" | "negative";
  tooltip: ReactNode;
}

export function ColumnChart({ items, formatTick = fmtCompact }: { items: ColumnItem[]; formatTick?: (n: number) => string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const plotH = 200;
  const top = 18; // room for the value on the tallest cap
  const left = 44;
  const plotW = Math.max(10, width - left - 4);
  // Narrow bands (phones): tilt the category labels instead of letting them collide.
  const tilt = plotW / Math.max(1, items.length) < 56;
  const axisH = tilt ? 52 : 34;
  const ticks = niceTicks(Math.max(...items.map((i) => i.value), 0));
  const max = ticks[ticks.length - 1];
  const band = plotW / Math.max(1, items.length);
  const barW = Math.min(24, band * 0.6);
  const yOf = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => (setTip(null), setHovered(null))}>
      {width > 0 && (
        <svg width={width} height={top + plotH + axisH} role="img">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={left} x2={width} y1={yOf(tk)} y2={yOf(tk)} stroke={tk === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} />
              <text x={left - 6} y={yOf(tk)} dy="0.35em" textAnchor="end" {...AXIS_TEXT} className="tabular-nums">
                {formatTick(tk)}
              </text>
            </g>
          ))}
          {items.map((item, i) => {
            const cx = left + band * i + band / 2;
            const h = (item.value / max) * plotH;
            const active = hovered === item.key;
            const color = item.tone === "negative" ? "var(--viz-negative)" : "var(--viz-series-1)";
            return (
              <g
                key={item.key}
                onPointerMove={(e) => {
                  const box = ref.current!.getBoundingClientRect();
                  setHovered(item.key);
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content: item.tooltip });
                }}
              >
                <rect x={left + band * i} y={top} width={band} height={plotH} fill="transparent" />
                <path d={vBarPath(cx - barW / 2, top + plotH, barW, h)} fill={color} opacity={hovered && !active ? 0.55 : 1} />
                {item.value > 0 && (
                  <text x={cx} y={yOf(item.value) - 5} textAnchor="middle" {...AXIS_TEXT} fill="var(--viz-text)" className="tabular-nums">
                    {item.valueLabel}
                  </text>
                )}
                <text
                  x={cx}
                  y={top + plotH + 14}
                  textAnchor={tilt ? "end" : "middle"}
                  transform={tilt ? `rotate(-40 ${cx} ${top + plotH + 14})` : undefined}
                  {...AXIS_TEXT}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip state={tip} width={width} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scatter (emphasis: highlighted points in the accent, the rest gray)
// ---------------------------------------------------------------------------

export interface ScatterPoint {
  key: string;
  x: number;
  y: number;
  emphasis: boolean;
  tooltip: ReactNode;
}

export function ScatterChart({
  points,
  xLabel,
  yLabel,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const plotH = 260;
  const top = 8;
  const left = 48;
  const right = 10;
  const axisH = 40;
  const plotW = Math.max(10, width - left - right);
  const xTicks = niceTicks(Math.max(...points.map((p) => p.x), 0), 5);
  const yTicks = niceTicks(Math.max(...points.map((p) => p.y), 0), 4);
  const xMax = xTicks[xTicks.length - 1];
  const yMax = yTicks[yTicks.length - 1];
  const px = (v: number) => left + (v / xMax) * plotW;
  const py = (v: number) => top + plotH - (v / yMax) * plotH;

  // Gray first, highlighted on top, hovered last.
  const ordered = [...points].sort((a, b) => Number(a.emphasis) - Number(b.emphasis));
  const hoveredPoint = points.find((p) => p.key === hovered);

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const box = ref.current!.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    // Nearest point within 24px — the reader shouldn't have to land on an 8px dot.
    let best: ScatterPoint | null = null;
    let bestD = 24 * 24;
    for (const p of points) {
      const d = (px(p.x) - mx) ** 2 + (py(p.y) - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setHovered(best?.key ?? null);
    setTip(best ? { x: px(best.x), y: py(best.y), content: best.tooltip } : null);
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => (setTip(null), setHovered(null))}>
      {width > 0 && (
        <svg width={width} height={top + plotH + axisH} role="img">
          {yTicks.map((tk) => (
            <g key={`y${tk}`}>
              <line x1={left} x2={width - right} y1={py(tk)} y2={py(tk)} stroke={tk === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} />
              <text x={left - 6} y={py(tk)} dy="0.35em" textAnchor="end" {...AXIS_TEXT} className="tabular-nums">
                {fmtCompact(tk)}
              </text>
            </g>
          ))}
          {xTicks.map((tk, i) => (
            <text
              key={`x${tk}`}
              x={px(tk)}
              y={top + plotH + 16}
              textAnchor={i === xTicks.length - 1 ? "end" : "middle"}
              {...AXIS_TEXT}
              className="tabular-nums"
            >
              {fmtCompact(tk)}
            </text>
          ))}
          <text x={left + plotW / 2} y={top + plotH + 34} textAnchor="middle" {...AXIS_TEXT}>
            {xLabel}
          </text>
          <text x={left + 4} y={top + 10} {...AXIS_TEXT}>
            {yLabel}
          </text>
          {ordered.map((p) => (
            <circle
              key={p.key}
              cx={px(p.x)}
              cy={py(p.y)}
              r={4}
              fill={p.emphasis ? "var(--viz-series-1)" : "var(--viz-muted-mark)"}
              stroke="var(--viz-surface)"
              strokeWidth={1.5}
            />
          ))}
          {hoveredPoint && (
            <circle
              cx={px(hoveredPoint.x)}
              cy={py(hoveredPoint.y)}
              r={6}
              fill={hoveredPoint.emphasis ? "var(--viz-series-1)" : "var(--viz-text-muted)"}
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          )}
          <rect x={left} y={top} width={plotW} height={plotH} fill="transparent" onPointerMove={handleMove} />
        </svg>
      )}
      <Tooltip state={tip} width={width} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative share curve (0–100% on both axes) with a crosshair
// ---------------------------------------------------------------------------

export function CumulativeChart({
  points,
  annotateAt,
  annotationLabel,
  referenceLabel,
  tooltipFor,
}: {
  /** x and y are fractions 0..1, x ascending, starting at (0,0). */
  points: { x: number; y: number }[];
  annotateAt: number;
  annotationLabel: string;
  referenceLabel: string;
  tooltipFor: (p: { x: number; y: number }) => ReactNode;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const plotH = 240;
  const top = 8;
  const left = 40;
  const right = 12;
  const axisH = 24;
  const plotW = Math.max(10, width - left - right);
  const px = (v: number) => left + v * plotW;
  const py = (v: number) => top + plotH - v * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const line = points.map((p, i) => `${i ? "L" : "M"}${px(p.x)},${py(p.y)}`).join("");
  const area = `${line}L${px(1)},${py(0)}L${px(0)},${py(0)}Z`;
  const annotated = points.reduce((best, p) => (Math.abs(p.x - annotateAt) < Math.abs(best.x - annotateAt) ? p : best), points[0]);
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const box = ref.current!.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - box.left - left) / plotW));
    let idx = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].x - fx) < Math.abs(points[idx].x - fx)) idx = i;
    setHoverIdx(idx);
    setTip({ x: px(points[idx].x), y: py(points[idx].y), content: tooltipFor(points[idx]) });
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => (setTip(null), setHoverIdx(null))}>
      {width > 0 && points.length > 1 && (
        <svg width={width} height={top + plotH + axisH} role="img">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={left} x2={width - right} y1={py(tk)} y2={py(tk)} stroke={tk === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} />
              <text x={left - 6} y={py(tk)} dy="0.35em" textAnchor="end" {...AXIS_TEXT} className="tabular-nums">
                {fmtPct(tk)}
              </text>
              <text
                x={px(tk)}
                y={top + plotH + 16}
                textAnchor={tk === 1 ? "end" : "middle"}
                {...AXIS_TEXT}
                className="tabular-nums"
              >
                {fmtPct(tk)}
              </text>
            </g>
          ))}
          {/* equal-share reference: a thin muted line, labeled directly */}
          <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="var(--viz-axis)" strokeWidth={1} />
          <text x={px(0.62)} y={py(0.62)} dy={-6} {...AXIS_TEXT} transform={`rotate(${-Math.atan2(plotH, plotW) * (180 / Math.PI)} ${px(0.62)} ${py(0.62)})`}>
            {referenceLabel}
          </text>
          <path d={area} fill="var(--viz-area)" />
          <path d={line} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* direct annotation at the point the story is about */}
          <circle cx={px(annotated.x)} cy={py(annotated.y)} r={4.5} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
          <text x={px(annotated.x) + 8} y={py(annotated.y) + 16} {...AXIS_TEXT} fill="var(--viz-text)" fontWeight={600}>
            {annotationLabel}
          </text>
          {hoverPoint && (
            <>
              <line x1={px(hoverPoint.x)} x2={px(hoverPoint.x)} y1={top} y2={top + plotH} stroke="var(--viz-axis)" />
              <circle cx={px(hoverPoint.x)} cy={py(hoverPoint.y)} r={4.5} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
            </>
          )}
          <rect x={left} y={top} width={plotW} height={plotH} fill="transparent" onPointerMove={handleMove} />
        </svg>
      )}
      <Tooltip state={tip} width={width} />
    </div>
  );
}
