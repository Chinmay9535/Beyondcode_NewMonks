"use client";

import { BookOpen, Mic, Phone, SendHorizonal, ShieldAlert, Square, Volume2 } from "lucide-react";
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
  return (
    <div className={cx("rise flex w-full", me ? "justify-end" : "justify-start")}>
      <div
        lang={m.lang}
        className={cx(
          "max-w-[88%] rounded-3xl px-4 py-3 text-[17px] leading-relaxed",
          me && "rounded-br-md border border-accent/35 bg-accent/12",
          !me && !safety && "rounded-bl-md bg-surface-2",
          safety && (urgent ? "rounded-bl-md border-2 border-danger bg-danger-bg" : "rounded-bl-md border border-warn/50 bg-warn-bg"),
        )}
      >
        {safety && (
          <p className={cx("mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em]", urgent ? "text-danger" : "text-warn")}>
            <ShieldAlert size={14} /> {urgent ? "Doctor alerted · urgent" : "Shared with your doctor"}
          </p>
        )}
        <p className="whitespace-pre-line">{m.text}</p>
        {showEn && en && <p lang="en" className="mt-1.5 text-[13.5px] leading-snug text-muted">{en}</p>}
        {!!m.meta.citations?.length && (
          <p className="mt-2 flex items-start gap-1.5 font-mono text-[11px] leading-snug text-sky">
            <BookOpen size={13} className="mt-px shrink-0" />
            <span>{tr(lang, "source")} · {m.meta.citations.map((c) => `${c.source.split("(")[0].trim()} · ${c.title}`).join("; ")}</span>
          </p>
        )}
        {safety && clinic && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${clinic.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-medium text-bg"><Phone size={16} /> {tr(lang, "callClinic")}</a>
            {urgent && <a href={`tel:${clinic.emergency_number}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-danger px-4 text-[15px] font-medium text-white">{tr(lang, "emergency")} {clinic.emergency_number}</a>}
          </div>
        )}
        {!me && (
          <button type="button" onClick={() => speak(m.text, lang, !!ttsServer)} className="mt-1.5 -ml-1 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-[12px] text-muted hover:text-ink" aria-label={tr(lang, "readAloud")}>
            <Volume2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function MessageList({ messages, lang, showEn, busy, clinic, ttsServer }: { messages: Message[]; lang: Lang; showEn: boolean; busy?: boolean; clinic?: Clinic; ttsServer?: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, busy]);
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {messages.map((m) => <Bubble key={m.id} m={m} lang={lang} showEn={showEn} clinic={clinic} ttsServer={ttsServer} />)}
      {busy && <div className="rounded-3xl rounded-bl-md bg-surface-2 px-4 py-3.5 text-muted self-start"><span className="typing"><i /><i /><i /></span></div>}
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
    <div className="flex flex-col gap-3">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.value} type="button" disabled={disabled} onClick={() => onSend("", o.value)}
              className="min-h-12 rounded-full border border-accent/50 bg-surface px-5 text-[16px] font-medium text-ink transition hover:bg-accent hover:text-on-accent disabled:opacity-50">
              {o.label}
            </button>
          ))}
        </div>
      )}
      {dict.listening && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[17px] text-muted">{dict.interim || tr(lang, "listening")}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || !dict.supported}
          onClick={() => (dict.listening ? dict.stop() : dict.start())}
          aria-label={dict.listening ? tr(lang, "listening") : tr(lang, "tapToSpeak")}
          title={dict.supported ? tr(lang, "tapToSpeak") : tr(lang, "noVoice")}
          className={cx("grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition disabled:opacity-40", dict.listening && "listening")}
        >
          {dict.listening ? <Square size={22} fill="currentColor" /> : <Mic size={28} />}
        </button>
        <form className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface pl-4 pr-1.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || tr(lang, "typeHere")}
            lang={lang}
            className="min-h-13 min-w-0 flex-1 bg-transparent py-3 text-[17px] text-ink placeholder:text-muted focus:outline-none"
            aria-label={placeholder || tr(lang, "typeHere")}
          />
          <button type="submit" disabled={disabled || !text.trim()} aria-label={tr(lang, "send")} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-40">
            <SendHorizonal size={18} />
          </button>
        </form>
      </div>
      {!dict.supported && <p className="text-[13px] text-muted">{tr(lang, "noVoice")}</p>}
    </div>
  );
}
