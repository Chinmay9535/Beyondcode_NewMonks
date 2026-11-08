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

/** Picks the most natural browser voice for a language. Edge ships free neural voices
 *  ("Microsoft Sapna Online (Natural) - Kannada"), Chrome has "Google हिन्दी", Android has
 *  Google's on-device voices; the old desktop voices sound robotic, so they come last. */
export function bestVoice(voices: SpeechSynthesisVoice[], locale: string, lang: string): SpeechSynthesisVoice | undefined {
  const score = (v: SpeechSynthesisVoice) => {
    let n = v.lang === locale ? 100 : v.lang.replace("_", "-").startsWith(lang + "-") ? 60 : -1;
    if (n < 0) return n;
    if (/natural|neural/i.test(v.name)) n += 30;
    if (/online/i.test(v.name)) n += 10;
    if (/google/i.test(v.name)) n += 20;
    if (!v.localService) n += 5;   // cloud voices are usually the higher-quality ones
    if (/female|sapna|swara|pallavi|neerja|heera|kalpana|veena/i.test(v.name)) n += 3;
    return n;
  };
  return voices.map((v) => [score(v), v] as const).filter(([n]) => n >= 0).sort((a, b) => b[0] - a[0])[0]?.[1];
}

/** Text-to-speech: natural voice from the backend (Sarvam or Azure) if configured, else the browser's best voice. */
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
  let voices = synth.getVoices();
  if (!voices.length) {
    // Chrome fills the voice list asynchronously; wait briefly for it.
    await new Promise<void>((done) => { const t = setTimeout(done, 1000); synth.addEventListener("voiceschanged", () => { clearTimeout(t); done(); }, { once: true }); });
    voices = synth.getVoices();
  }
  const voice = bestVoice(voices, locale, lang);
  if (!voice && lang !== "en") return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  if (voice) u.voice = voice;
  u.rate = 0.92;
  synth.speak(u);
  return true;
}

/** True while browser speech or server audio is playing. */
export function isSpeaking() {
  if (typeof window === "undefined") return false;
  return !!window.speechSynthesis?.speaking || (!!currentAudio && !currentAudio.paused && !currentAudio.ended);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
}
