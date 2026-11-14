import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import TL from '../timeline.json';

export const W = 1920;
export const H = 1080;

export type Word = {w: string; t: number; e: number};
export type SceneData = {id: string; start: number; dur: number; vo?: number; voDur?: number; words: Word[]};
export const SCENES: SceneData[] = (TL as any).scenes;
export const scene = (id: string) => SCENES.find((s) => s.id === id)!;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k: number) => k * k * k;
export const smooth = (k: number) => k * k * (3 - 2 * k);
/** 0..1 ramp between times a and b (seconds) */
export const ramp = (t: number, a: number, b: number, ease = smooth) => ease(clamp((t - a) / (b - a)));
/** fade in at a over d, fade out at b over d */
export const window_ = (t: number, a: number, b: number, d = 0.5) => ramp(t, a, a + d) * (1 - ramp(t, b - d, b));

/** seconds since the start of the current Sequence */
export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '');
/** time (scene-local seconds) at which the n-th occurrence of word w starts */
export const at = (sc: SceneData, w: string, n = 1): number => {
  let c = 0;
  const target = norm(w);
  for (const x of sc.words) {
    if (norm(x.w) === target) {
      c++;
      if (c === n) return (sc.vo ?? 0) + x.t;
    }
  }
  throw new Error(`word not found ${sc.id} ${w} ${n}`);
};
/** time at which the phrase (sequence of words) starts */
export const atPhrase = (sc: SceneData, phrase: string, n = 1): number => {
  const ws = phrase.split(/\s+/).map(norm);
  let c = 0;
  for (let i = 0; i < sc.words.length; i++) {
    let ok = true;
    for (let j = 0; j < ws.length; j++) if (!sc.words[i + j] || norm(sc.words[i + j].w) !== ws[j]) { ok = false; break; }
    if (ok) { c++; if (c === n) return (sc.vo ?? 0) + sc.words[i].t; }
  }
  throw new Error(`phrase not found ${sc.id} ${phrase}`);
};
export const endOf = (sc: SceneData, w: string, n = 1): number => {
  let c = 0;
  const target = norm(w);
  for (const x of sc.words) if (norm(x.w) === target) { c++; if (c === n) return (sc.vo ?? 0) + x.e; }
  return 0;
};

// deterministic random
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = rnd(i + seed * 1000);
  const b = rnd(i + 1 + seed * 1000);
  return lerp(a, b, smooth(f));
};
export const fbm = (x: number, seed = 0, oct = 4) => {
  let v = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) { v += amp * noise1(x * fr, seed + i * 17); amp *= 0.5; fr *= 2.03; }
  return v;
};

export const mixColor = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, k));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k));
  const bl = Math.round(lerp(pa & 255, pb & 255, k));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
};

export const Abs: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) =>
  React.createElement('div', {style: {position: 'absolute', inset: 0, ...style}}, children);
