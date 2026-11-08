"use client";

import { ArrowRight, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Brand mark: a speech-bubble chip with a glossy "lens". */
export function Logo({ size = 28, compact = false }: { size?: number; compact?: boolean }) {
  const s = size / 28;
  return (
    <span className="relative inline-flex items-center gap-2 rounded-[10px] bg-white px-2.5 shadow-[0_10px_30px_-12px_rgba(47,123,255,.6)]" style={{ height: 30 * s }}>
      <span className="sphere sphere-blue block shrink-0" style={{ width: 15 * s, height: 15 * s, boxShadow: "none" }} />
      {!compact && <span className="font-bold tracking-[-0.02em] text-[#1f6bff]" style={{ fontSize: 15 * s }}>DrishtiSaathi</span>}
      <span aria-hidden className="absolute -bottom-[5px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-white" />
    </span>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("glass hairline rounded-[26px] p-5", className)} {...rest}>
      {children}
    </div>
  );
}

/** White circle with an arrow, used inside buttons (as in "Get started →"). */
export function ArrowDot({ tone = "light", size = 22 }: { tone?: "light" | "blue"; size?: number }) {
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full", tone === "light" ? "bg-white text-[#1f6bff]" : "bg-accent text-white")} style={{ width: size, height: size }}>
      <ArrowRight size={size * 0.62} strokeWidth={2.6} />
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger" | "outline"; size?: "md" | "lg" | "sm"; arrow?: boolean };
export function Button({ variant = "primary", size = "md", arrow, className, children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex select-none items-center justify-center gap-2.5 rounded-full font-semibold tracking-[-0.01em] transition duration-200 ease-out active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45",
        size === "lg" && "min-h-14 px-6 text-[1.0312rem]",
        size === "md" && "min-h-11 px-5 text-[0.9375rem]",
        size === "sm" && "min-h-9 px-3.5 text-[0.8125rem]",
        variant === "primary" && "btn-primary",
        variant === "outline" && "border border-line-strong bg-transparent text-ink hover:bg-surface-2",
        variant === "soft" && "glass text-ink hover:border-line-strong",
        variant === "ghost" && "text-muted hover:text-ink",
        variant === "danger" && "border border-danger/40 bg-danger-bg text-danger hover:border-danger",
        arrow && size !== "sm" && "pr-2.5",
        className,
      )}
      {...rest}
    >
      {children}
      {arrow && <ArrowDot tone={variant === "primary" ? "light" : "blue"} size={size === "lg" ? 28 : 24} />}
    </button>
  );
}

const TONES = {
  neutral: "border-line bg-surface-2 text-muted",
  ok: "border-transparent bg-ok-bg text-ok",
  warn: "border-transparent bg-warn-bg text-warn",
  danger: "border-transparent bg-danger-bg text-danger",
  sky: "border-transparent bg-sky-bg text-sky",
  accent: "border-transparent btn-primary",
} as const;
export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof TONES; className?: string; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7188rem] font-semibold leading-none", TONES[tone], className)}>{children}</span>;
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("tag", className)}>{children}</span>;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t !== "light");
  }, []);
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ds-theme", next); } catch {}
    setDark(!dark);
  };
  return (
    <button type="button" onClick={flip} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className="glass grid h-10 w-10 place-items-center rounded-full text-muted transition hover:text-ink">
      {dark ? <Sun size={17} /> : <Moon size={17} />}
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
