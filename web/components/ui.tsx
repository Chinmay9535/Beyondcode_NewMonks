"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="22" fill="none" stroke="var(--accent)" strokeWidth="6" />
        <circle cx="32" cy="32" r="9" fill="var(--sky)" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.02em]">
        Drishti<span className="serif text-[19px] text-accent-text">Saathi</span>
      </span>
    </span>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-3xl border border-line bg-surface p-5", className)} {...rest}>
      {children}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger"; size?: "md" | "lg" | "sm" };
export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" && "min-h-14 px-6 text-[17px]",
        size === "md" && "min-h-11 px-5 text-[15px]",
        size === "sm" && "min-h-9 px-3.5 text-[13px]",
        variant === "primary" && "bg-accent text-on-accent hover:brightness-110",
        variant === "soft" && "border border-line bg-surface-2 text-ink hover:border-muted",
        variant === "ghost" && "text-muted hover:text-ink",
        variant === "danger" && "border border-danger/40 bg-danger-bg text-danger hover:border-danger",
        className,
      )}
      {...rest}
    />
  );
}

const TONES = {
  neutral: "border-line bg-surface-2 text-muted",
  ok: "border-transparent bg-ok-bg text-ok",
  warn: "border-transparent bg-warn-bg text-warn",
  danger: "border-transparent bg-danger-bg text-danger",
  sky: "border-transparent bg-sky-bg text-sky",
  accent: "border-transparent bg-accent text-on-accent",
} as const;
export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof TONES; className?: string; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] leading-none", TONES[tone], className)}>{children}</span>;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : !matchMedia("(prefers-color-scheme: light)").matches);
  }, []);
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ds-theme", next); } catch {}
    setDark(!dark);
  };
  return (
    <button type="button" onClick={flip} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted" role="status">
      <span className="typing"><i /><i /><i /></span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
