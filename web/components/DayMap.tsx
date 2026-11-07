"use client";

import {
  BookOpen, Car, Check, CookingPot, Eye, Footprints, Glasses, Laptop, Moon, Scissors, Smartphone, Sparkle, Sprout, Store, Tv, TriangleAlert,
} from "lucide-react";
import type { Activity, DayRow, Lang, LensOption } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { cx } from "./ui";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  needle: Scissors, reading: BookOpen, phone: Smartphone, computer: Laptop, cooking: CookingPot, shop: Store, tv: Tv,
  farming: Sprout, walking: Footprints, night_drive: Moon, day_drive: Car,
};
export function ActivityIcon({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  const I = ICONS[id] || Eye;
  return <I size={size} className={className} />;
}

export function distanceLabel(cm: number, lang: Lang = "en") {
  return cm >= 300 ? tr(lang, "far") : `${Math.round(cm)} cm`;
}

const STATUS = {
  clear: { tone: "text-ok bg-ok-bg", Icon: Check },
  strain: { tone: "text-warn bg-warn-bg", Icon: TriangleAlert },
  glasses: { tone: "text-danger bg-danger-bg", Icon: Glasses },
} as const;

export function StatusChip({ row, lang, compact }: { row: DayRow; lang: Lang; compact?: boolean }) {
  const s = STATUS[row.status];
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium", s.tone)}>
        <s.Icon size={14} /> {compact ? null : tr(lang, row.status)}
      </span>
      {row.halos && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-bg px-2.5 py-1 text-[13px] text-sky" title={tr(lang, "halos")}>
          <Sparkle size={13} /> {compact ? null : tr(lang, "halos")}
        </span>
      )}
    </span>
  );
}

/** Patient view: the day, activity by activity, with one lens. */
export function PatientDayMap({ activities, option, lang, labels }: { activities: Activity[]; option?: LensOption | null; lang: Lang; labels?: Record<string, string | null | undefined> }) {
  const rows = new Map(option?.day_map.map((r) => [r.activity, r]));
  return (
    <ul className="flex flex-col divide-y divide-line">
      {activities.map((a) => {
        const r = rows.get(a.id);
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-accent-text"><ActivityIcon id={a.id} /></span>
            <div className="min-w-0 flex-1">
              <p lang={lang} className="text-[16px] font-medium leading-snug">{labels?.[a.id] || a.label_local || a.label}</p>
              <p className="text-[13px] text-muted">
                {tr(lang, "hoursDay", { h: a.hours })}{a.night ? ` · ${tr(lang, "atNight")}` : ""} · {distanceLabel(a.distance_cm, lang)}
              </p>
            </div>
            {r && <StatusChip row={r} lang={lang} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Surgeon view: activities x lens options. */
export function DayMatrix({ activities, options }: { activities: Activity[]; options: LensOption[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[14px]">
        <thead>
          <tr>
            <th className="eyebrow pb-3 text-left font-normal">Activity</th>
            {options.map((o) => (
              <th key={o.key} className={cx("pb-3 text-left text-[13px] font-semibold", o.excluded && "text-muted line-through")}>{o.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((a, i) => (
            <tr key={a.id} className="border-t border-line align-top">
              <td className="py-2.5 pr-3">
                <div className="flex items-start gap-2.5">
                  <ActivityIcon id={a.id} size={16} className="mt-0.5 shrink-0 text-accent-text" />
                  <div>
                    <p className="font-medium leading-tight">{a.label}</p>
                    <p className="font-mono text-[11px] text-muted">{a.hours} h · {distanceLabel(a.distance_cm)} · {a.detail}{a.night ? " · night" : ""} · ★{a.importance}</p>
                  </div>
                </div>
              </td>
              {options.map((o) => {
                const r = o.day_map[i];
                return (
                  <td key={o.key} className={cx("py-2.5 pr-3", o.excluded && "opacity-45")}>
                    <span className={cx("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[12px]", STATUS[r.status].tone)}>
                      {(() => { const I = STATUS[r.status].Icon; return <I size={13} />; })()}
                      {r.snellen}
                    </span>
                    {r.halos && <Sparkle size={13} className="ml-1.5 inline text-sky" aria-label="halos" />}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-line">
            <td className="pt-3 font-mono text-[11px] uppercase tracking-[.1em] text-muted">Clear without glasses</td>
            {options.map((o) => (
              <td key={o.key} className="pt-3 font-mono text-[13px] font-medium">{o.hours_clear} / {o.hours_total} h</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
