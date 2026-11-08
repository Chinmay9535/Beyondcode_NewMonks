"use client";

// Building blocks for the dashboard-style screens: stat tiles (label on top, one big number),
// pill tabs with a sliding indicator, and quiet label/value lists. Few elements, lots of space;
// colour only where it carries meaning.

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { NumberTicker } from "./magicui/number-ticker";
import SpotlightCard from "./reactbits/SpotlightCard";
import { cx } from "./ui";

/** Current theme from <html data-theme>, kept in sync with the toggle. */
export function useTheme(): "dark" | "light" {
  const [t, setT] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const el = document.documentElement, read = () => setT(el.dataset.theme === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}

type StatProps = {
  label: string;
  value: number | string;
  decimals?: number;
  unit?: string;
  hint?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "plain" | "accent" | "danger" | "ok";
  spotlight?: boolean;
  className?: string;
};

/** A stat tile: small label and icon on top, one big number at the bottom. */
export function Stat({ label, value, decimals = 0, unit, hint, icon: Icon, tone = "plain", spotlight = false, className }: StatProps) {
  const theme = useTheme();
  const body = (
    <div className="flex h-full min-h-[118px] flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-2">
        <span className={cx("text-[0.8125rem] font-medium leading-snug", tone === "accent" ? "text-white/80" : "text-muted")}>{label}</span>
        {Icon && <Icon size={17} className={cx("shrink-0", tone === "accent" ? "text-white/80" : tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : "text-muted")} />}
      </div>
      <div>
        <p className="flex items-baseline gap-1.5 leading-none">
          <span className={cx("text-[2.25rem] font-semibold tracking-[-0.03em]", tone === "danger" && "text-danger", tone === "ok" && "text-ok")}>
            {typeof value === "number"
              ? <NumberTicker value={value} decimalPlaces={decimals} className="tracking-[-0.03em] text-inherit dark:text-inherit" />
              : value}
          </span>
          {unit && <span className={cx("text-[0.875rem] font-medium", tone === "accent" ? "text-white/75" : "text-muted")}>{unit}</span>}
        </p>
        {hint && <p className={cx("mt-1.5 truncate text-[0.75rem]", tone === "accent" ? "text-white/70" : "text-muted")}>{hint}</p>}
      </div>
    </div>
  );
  if (tone === "accent") return <div className={cx("stat-accent rounded-[22px] p-4 text-white", className)}>{body}</div>;
  if (spotlight) {
    return (
      <SpotlightCard theme={theme} className={cx("!rounded-[22px] !p-4", className)} spotlightColor={theme === "dark" ? "#7aa2ff" : "#1f6bff"} intensity={0.12}
        style={{ "--spotlight-card-surface": "var(--surface-solid)", "--spotlight-card-border": "var(--line)", "--spotlight-card-shadow": "none" }}>
        {body}
      </SpotlightCard>
    );
  }
  return <div className={cx("rounded-[22px] border border-line bg-surface-solid p-4", className)}>{body}</div>;
}

export type TabDef<T extends string> = { id: T; label: string; count?: number; alert?: boolean; icon?: React.ComponentType<{ size?: number; className?: string }> };

/** Pill tabs with a sliding indicator. */
export function PillTabs<T extends string>({ tabs, value, onChange, id, className, size = "md" }: { tabs: TabDef<T>[]; value: T; onChange: (t: T) => void; id: string; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="tablist" className={cx("no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface-solid p-1", className)}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx("relative flex shrink-0 items-center gap-2 rounded-full font-medium transition-colors", size === "sm" ? "min-h-8 px-3 text-[0.8125rem]" : "min-h-10 px-4 text-[0.875rem]",
            value === t.id ? "text-white" : "text-muted hover:text-ink")}>
          {value === t.id && <motion.span layoutId={`pill-${id}`} className="btn-primary absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          {t.icon && <t.icon size={15} className="relative" />}
          <span className="relative">{t.label}</span>
          {t.count != null && t.count > 0 && (
            <span className={cx("relative grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold",
              t.alert ? "bg-danger text-white" : value === t.id ? "bg-white/20 text-white" : "bg-surface-2 text-muted")}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Quiet label/value rows with hairline dividers. */
export function KV({ rows, className }: { rows: [React.ReactNode, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cx("divide-y divide-line", className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-[0.875rem]">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Section heading used inside cards. */
export function CardTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("mb-4 flex items-center gap-3", className)}>
      <h2 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{children}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
