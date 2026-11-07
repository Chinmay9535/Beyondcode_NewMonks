"use client";

import type { Activity } from "@/lib/api";
import { interp, vergence } from "@/lib/optics";
import { cx } from "./ui";

export type ChartCurve = { key: string; name: string; curve: [number, number][]; family?: string };

const COLORS: Record<string, string> = { monofocal: "var(--muted)", edof: "var(--sky)", trifocal: "var(--accent)" };
const DASH: Record<string, string> = {};
const DETAIL = { fine: 0.1, normal: 0.2, coarse: 0.3 } as const;

/** Defocus curves of each lens family with the patient's own activities placed at their working distance. */
export default function DefocusChart({ curves, activities, highlight }: { curves: ChartCurve[]; activities: Activity[]; highlight?: string }) {
  const W = 640, H = 300, m = { l: 46, r: 16, t: 26, b: 40 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X0 = 0.5, X1 = -4;
  const x = (d: number) => m.l + ((X0 - d) / (X0 - X1)) * iw;
  const y = (v: number) => m.t + (Math.min(v, 0.8) / 0.8) * ih;
  const path = (c: [number, number][]) => {
    let s = "";
    for (let i = 0; i <= 120; i++) { const d = X0 - ((X0 - X1) * i) / 120; s += (i ? "L" : "M") + x(d).toFixed(1) + "," + y(interp(c, d)).toFixed(1); }
    return s;
  };
  const placed = activities.map((a) => ({ a, d: Math.max(X1, vergence(a.distance_cm)) }));
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Defocus curves with the patient's activities">
        <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--muted)">
          {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={m.l - 8} y={y(v) + 3} textAnchor="end">{v.toFixed(1)}</text>
            </g>
          ))}
          {[0, -1, -2, -3, -4].map((d) => <text key={d} x={x(d)} y={H - m.b + 16} textAnchor="middle">{d === 0 ? "0" : `−${-d}`} D</text>)}
          <text x={m.l + iw / 2} y={H - 4} textAnchor="middle">Defocus (dioptres) · 0 D = far, −2.5 D = 40 cm</text>
          <text x={12} y={m.t + ih / 2} textAnchor="middle" transform={`rotate(-90 12 ${m.t + ih / 2})`}>logMAR (lower = sharper)</text>
        </g>
        {placed.map(({ a, d }, i) => (
          <g key={a.id}>
            <line x1={x(d)} x2={x(d)} y1={m.t} y2={m.t + ih} stroke="var(--line)" strokeDasharray="3 4" strokeWidth={1.5} />
            <rect x={x(d) - 5} y={y(DETAIL[a.detail]) - 1.5} width={10} height={3} fill="var(--text)" opacity={0.6} />
            <text x={x(d)} y={m.t - 8 - (i % 2) * 0} fontSize="10.5" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-sans)">
              {a.label.split(/[ ,]/)[0]}{a.night ? " ☾" : ""}
            </text>
          </g>
        ))}
        {curves.map((c) => (
          <path key={c.key} d={path(c.curve)} fill="none" stroke={COLORS[c.family || c.key] || "var(--text)"} strokeWidth={highlight === c.key ? 3.4 : 1.8}
            strokeDasharray={c.key.includes("blend") || c.key.includes("micro") ? "7 5" : DASH[c.key]} opacity={highlight && highlight !== c.key ? 0.45 : 1} strokeLinecap="round" />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        {curves.map((c) => (
          <span key={c.key} className={cx("inline-flex items-center gap-1.5", highlight === c.key && "text-ink")}><i className="inline-block h-0.5 w-4" style={{ background: COLORS[c.family || c.key] }} />{c.name}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[3px] w-3 bg-ink/60" />acuity the activity needs</span>
        <span>Both eyes combined · dashed = blended · illustrative curves</span>
      </figcaption>
    </figure>
  );
}
