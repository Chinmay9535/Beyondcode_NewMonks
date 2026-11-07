"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./api";
import { SPEECH_LOCALE } from "./i18n";

/* Minimal typings for the Web Speech API (not in lib.dom for all browsers). */
type SR = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Speech-to-text in the patient's language. Interim text streams into `interim`. */
export function useDictation(lang: Lang, onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<SR | null>(null);
  const finalRef = useRef("");
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => { setSupported(!!getRecognition()); }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const start = useCallback(() => {
    const R = getRecognition();
    if (!R) return;
    window.speechSynthesis?.cancel();
    const r = new R();
    r.lang = SPEECH_LOCALE[lang];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    finalRef.current = "";
    r.onresult = (e) => {
      let fin = "", mid = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else mid += res[0].transcript;
      }
      finalRef.current = fin;
      setInterim((fin + " " + mid).trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      if (text) cb.current(text);
    };
    rec.current = r;
    setListening(true);
    r.start();
  }, [lang]);

  return { supported, listening, interim, start, stop };
}

let currentAudio: HTMLAudioElement | null = null;

/** Text-to-speech: neural voice from the backend if configured, else the browser's own voice. */
export async function speak(text: string, lang: Lang, useServer: boolean): Promise<boolean> {
  if (typeof window === "undefined") return false;
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  if (useServer) {
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (res.status === 200) {
        const url = URL.createObjectURL(await res.blob());
        currentAudio = new Audio(url);
        await currentAudio.play();
        return true;
      }
    } catch {}
  }
  const synth = window.speechSynthesis;
  if (!synth) return false;
  const locale = SPEECH_LOCALE[lang];
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang === locale) || voices.find((v) => v.lang.startsWith(lang + "-"));
  if (!voice && lang !== "en") return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  if (voice) u.voice = voice;
  u.rate = 0.92;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
}
