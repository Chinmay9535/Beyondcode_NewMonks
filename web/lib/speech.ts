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

let playToken = 0;        // bumps on every new speak()/stop, cancelling older playback
let queueActive = false;  // true between server audio parts

/** Splits text for speech: the first sentence alone (so audio starts fast), then groups of ~30 words. */
export function speechParts(text: string): string[] {
  const sentences = text.split(/(?<=[.!?।॥])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  if (sentences.length <= 1) return [text.trim()];
  const parts = [sentences[0]];
  let cur = "";
  for (const s of sentences.slice(1)) {
    const cand = cur ? `${cur} ${s}` : s;
    if (cur && cand.split(/\s+/).length > 30) { parts.push(cur); cur = s; } else cur = cand;
  }
  if (cur) parts.push(cur);
  return parts;
}

/** Plays server audio part by part, fetching the next part while the current one plays.
 *  Resolves true once the first part starts playing, false if the server has no voice. */
function playServer(text: string, lang: Lang, token: number): Promise<boolean> {
  const fetchPart = (t: string) =>
    fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, lang }) })
      .then((r) => (r.status === 200 ? r.blob() : null)).catch(() => null);
  const parts = speechParts(text);
  return new Promise<boolean>((started) => {
    (async () => {
      let next = fetchPart(parts[0]);
      queueActive = true;
      try {
        for (let i = 0; i < parts.length; i++) {
          const blob = await next;
          if (token !== playToken) return started(true);
          if (!blob) return started(i > 0);
          if (i + 1 < parts.length) next = fetchPart(parts[i + 1]);
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudio = audio;
          const done = new Promise<void>((res) => { audio.onended = () => res(); audio.onpause = () => res(); audio.onerror = () => res(); });
          try { await audio.play(); } catch { URL.revokeObjectURL(url); return started(i > 0); }
          if (i === 0) started(true);
          await done;
          URL.revokeObjectURL(url);
          if (token !== playToken) return;
        }
      } finally {
        if (token === playToken) queueActive = false;
      }
    })();
  });
}

/** Text-to-speech: natural voice from the backend (local GPU, Azure or Sarvam) if configured, else the browser's best voice. */
// `useServer` is what /api/meta said when the page loaded; we still ask the server every time
// (it answers 204 instantly when it has no voice), so a voice server started later just works.
export async function speak(text: string, lang: Lang, useServer: boolean): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = ++playToken;
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  if (await playServer(text, lang, token)) return true;
  if (useServer) {
    // Developer hint: a server voice was configured but did not answer, so we fall back.
    console.warn("DrishtiSaathi: server voice unavailable, using the browser voice. Check /api/meta (tts_provider), tts-local/server.py and the backend log.");
  }
  if (token !== playToken) return true;
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
  if (!voice && lang !== "en") {
    // No voice for this language in this browser: let the app suggest one that has it.
    window.dispatchEvent(new CustomEvent("ds-novoice", { detail: lang }));
    return false;
  }
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
  return !!window.speechSynthesis?.speaking || queueActive || (!!currentAudio && !currentAudio.paused && !currentAudio.ended);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  playToken++;
  queueActive = false;
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
}
