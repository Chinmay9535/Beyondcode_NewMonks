"use client";

// Readability for older eyes: a text-size step, a high-contrast theme and
// read-aloud buttons on the main cards. Settings persist per device; the contrast flag is also
// restored before paint by the script in app/layout.tsx.

import { Check, Contrast, Square, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { isSpeaking, speak, stopSpeaking } from "@/lib/speech";
import { ThemeToggle, cx } from "./ui";

export const TEXT_STEPS = [1, 1.15, 1.3] as const;
const KEY = "ds-read";

type Reading = { size: number; contrast: boolean };

function load(): Reading {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { size: Math.min(TEXT_STEPS.length - 1, Math.max(0, Number(v.size) || 0)), contrast: !!v.contrast };
  } catch { return { size: 0, contrast: false }; }
}

/** Text-size step and contrast, persisted. Text sizes are in rem, so the step scales the root
 *  font size: text and spacing grow together and still wrap to the screen. Pixel-sized things
 *  (the calibrated eye test) are unaffected. Reset when the patient app unmounts. */
export function useReading() {
  const [r, setR] = useState<Reading | null>(null);   // null until read from storage
  useEffect(() => { setR(load()); }, []);
  useEffect(() => {
    if (!r) return;   // never overwrite the saved choice with the defaults
    const el = document.documentElement;
    if (r.contrast) el.dataset.contrast = "high"; else delete el.dataset.contrast;
    el.style.fontSize = r.size ? `${TEXT_STEPS[r.size] * 100}%` : "";
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {}
  }, [r]);
  useEffect(() => () => { document.documentElement.style.fontSize = ""; }, []);
  return { ...(r || { size: 0, contrast: false }), set: setR as (v: Reading) => void };
}

/** "Aa" button in the header; opens a small panel with text size and high contrast. */
export function ReadingButton({ lang, reading }: { lang: Lang; reading: ReturnType<typeof useReading> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={tr(lang, "readingOptions")}
        className={cx("grid h-10 w-10 place-items-center rounded-full text-[0.9375rem] font-bold transition", open || reading.size > 0 || reading.contrast ? "btn-primary" : "glass text-muted hover:text-ink")}>
        <span aria-hidden>A<span className="text-[0.6875rem]">a</span></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="glass-strong absolute right-0 top-12 z-40 w-[248px] origin-top-right rounded-2xl p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
            <p className="mb-2 px-1 text-[0.8125rem] font-semibold text-muted">{tr(lang, "textSize")}</p>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={tr(lang, "textSize")}>
              {TEXT_STEPS.map((z, i) => (
                <button key={z} type="button" role="radio" aria-checked={reading.size === i} onClick={() => reading.set({ ...reading, size: i })}
                  className={cx("grid h-12 place-items-center rounded-xl border font-semibold transition", reading.size === i ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-2")}
                  style={{ fontSize: 14 + i * 4 }}>A</button>
              ))}
            </div>
            <button type="button" role="switch" aria-checked={reading.contrast} onClick={() => reading.set({ ...reading, contrast: !reading.contrast })}
              className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 text-left text-[0.9375rem] font-medium">
              <Contrast size={18} className="shrink-0" />
              <span className="flex-1">{tr(lang, "highContrast")}</span>
              <span className={cx("grid h-6 w-6 place-items-center rounded-md border", reading.contrast ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>{reading.contrast && <Check size={15} />}</span>
            </button>
            <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface-2 pl-3 pr-1 text-[0.9375rem] font-medium">
              <span className="flex-1">{tr(lang, "theme")}</span>
              <ThemeToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small speaker button that reads a card's text in the patient's language. */
export function ListenButton({ text, lang, tts, className }: { text: string; lang: Lang; tts: boolean; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (!on) return;
    // Clear the "playing" state once speech or server audio ends.
    const t = setInterval(() => { if (!isSpeaking()) setOn(false); }, 600);
    return () => clearInterval(t);
  }, [on]);
  const click = async () => {
    if (on) { stopSpeaking(); setOn(false); return; }
    setOn(true);
    if (!(await speak(text, lang, tts))) setOn(false);
  };
  return (
    <button type="button" onClick={click} aria-pressed={on} aria-label={tr(lang, "readAloud")} title={tr(lang, "readAloud")}
      className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full transition", on ? "btn-primary" : "glass text-muted hover:text-ink", className)}>
      {on ? <Square size={14} fill="currentColor" /> : <Volume2 size={18} />}
    </button>
  );
}
