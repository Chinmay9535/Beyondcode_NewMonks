"use client";

import { ArrowUp, BookOpen, Mic, Phone, ShieldAlert, Square, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Clinic, Lang, Message, Option } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { speak, useDictation } from "@/lib/speech";
import { cx } from "./ui";

export function Bubble({ m, lang, showEn, clinic, ttsServer }: { m: Message; lang: Lang; showEn: boolean; clinic?: Clinic; ttsServer?: boolean }) {
  const me = m.role === "patient";
  const safety = m.meta.kind === "safety";
  const urgent = safety && m.meta.severity === "urgent";
  const en = m.text_en && m.text_en !== m.text ? m.text_en : null;
  const light = !me && !safety;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ transformOrigin: me ? "100% 100%" : "0% 100%" }}
      className={cx("flex w-full", me ? "justify-end" : "justify-start")}
    >
      <div
        lang={m.lang}
        className={cx(
          "bubble max-w-[88%] px-4 py-3 text-[1.0625rem] font-medium leading-relaxed",
          me && "bubble-blue bubble-r",
          light && "bubble-light bubble-l",
          safety && "bubble-l border-2 font-normal",
          safety && (urgent ? "border-danger bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface-solid))]" : "border-warn/60 bg-[color-mix(in_oklab,var(--warn)_12%,var(--surface-solid))]"),
        )}
      >
        {safety && (
          <p className={cx("mb-1.5 flex items-center gap-2 text-[0.8125rem] font-bold", urgent ? "text-danger" : "text-warn")}>
            <ShieldAlert size={15} /> {tr(lang, urgent ? "doctorAlerted" : "sharedDoctor")}
          </p>
        )}
        <p className="relative whitespace-pre-line">{m.text}</p>
        {showEn && en && <p lang="en" className={cx("relative mt-1.5 text-[0.8438rem] font-normal leading-snug", me ? "text-white/75" : light ? "text-[#5b6474]" : "text-muted")}>{en}</p>}
        {!!m.meta.citations?.length && (
          <p className={cx("relative mt-2 flex items-start gap-1.5 text-[0.7188rem] font-semibold leading-snug", light ? "text-[#1f6bff]" : "text-accent-text")}>
            <BookOpen size={13} className="mt-px shrink-0" />
            <span>{tr(lang, "source")} · {m.meta.citations.map((c) => `${c.source.split("(")[0].trim()} · ${c.title}`).join("; ")}</span>
          </p>
        )}
        {safety && clinic && (
          <div className="relative mt-3 flex flex-wrap gap-2">
            <a href={`tel:${clinic.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[0.9375rem] font-semibold text-bg"><Phone size={16} /> {tr(lang, "callClinic")}</a>
            {urgent && <a href={`tel:${clinic.emergency_number}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-danger px-4 text-[0.9375rem] font-semibold text-white">{tr(lang, "emergency")} {clinic.emergency_number}</a>}
          </div>
        )}
        {!me && (
          <button type="button" onClick={() => speak(m.text, lang, !!ttsServer)} className={cx("relative mt-1.5 -ml-1 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-[0.75rem] transition", light ? "text-[#5b6474] hover:text-[#0f131b]" : "text-muted hover:text-ink")} aria-label={tr(lang, "readAloud")}>
            <Volume2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function MessageList({ messages, lang, showEn, busy, clinic, ttsServer }: { messages: Message[]; lang: Lang; showEn: boolean; busy?: boolean; clinic?: Clinic; ttsServer?: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, busy]);
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {messages.map((m) => <Bubble key={m.id} m={m} lang={lang} showEn={showEn} clinic={clinic} ttsServer={ttsServer} />)}
      <AnimatePresence>
        {busy && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="bubble bubble-light bubble-l self-start px-4 py-3.5 text-[#5b6474]"><span className="typing"><i /><i /><i /></span></motion.div>
        )}
      </AnimatePresence>
      <div ref={end} />
    </div>
  );
}

/** Voice-first input: one big mic button, quick-reply chips, and a text box as fallback. */
export function Composer({ lang, onSend, options = [], disabled, placeholder }: {
  lang: Lang; onSend: (text: string, choice?: string) => void; options?: Option[]; disabled?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState("");
  const dict = useDictation(lang, (t) => onSend(t));
  const submit = () => { const t = text.trim(); if (t) { onSend(t); setText(""); } };
  return (
    <div className="dock flex flex-col gap-3 rounded-[28px] p-2.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,.8)]">
      <AnimatePresence initial={false}>
        {options.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 px-1 pt-1">
            {options.map((o, i) => (
              <motion.button key={o.value} type="button" disabled={disabled} onClick={() => onSend("", o.value)}
                initial={{ opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 26, delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }}
                className="min-h-12 rounded-2xl border border-line-strong bg-surface-2 px-5 text-[1rem] font-semibold text-ink transition-colors hover:border-transparent hover:bg-accent hover:text-white disabled:opacity-50">
                {o.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {dict.listening && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[1.0625rem] text-muted">{dict.interim || tr(lang, "listening")}</p>}
      <div className="flex items-center gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          disabled={disabled || !dict.supported}
          onClick={() => (dict.listening ? dict.stop() : dict.start())}
          aria-label={dict.listening ? tr(lang, "listening") : tr(lang, "tapToSpeak")}
          title={dict.supported ? tr(lang, "tapToSpeak") : tr(lang, "noVoice")}
          className={cx("btn-primary grid h-14 w-14 shrink-0 place-items-center rounded-full disabled:opacity-40", dict.listening && "listening")}
        >
          {dict.listening ? <Square size={20} fill="currentColor" /> : <Mic size={26} />}
        </motion.button>
        <form className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 pl-4 pr-1.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || tr(lang, "typeHere")}
            lang={lang}
            className="min-h-14 min-w-0 flex-1 bg-transparent py-3 text-[1.0625rem] text-ink placeholder:text-muted focus:outline-none"
            aria-label={placeholder || tr(lang, "typeHere")}
          />
          <motion.button type="submit" whileTap={{ scale: 0.9 }} disabled={disabled || !text.trim()} aria-label={tr(lang, "send")} className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#1f6bff] transition disabled:bg-surface-2 disabled:text-muted">
            <ArrowUp size={20} strokeWidth={2.6} />
          </motion.button>
        </form>
      </div>
      {!dict.supported && <p className="px-2 pb-1 text-[0.8125rem] text-muted">{tr(lang, "noVoice")}</p>}
    </div>
  );
}
