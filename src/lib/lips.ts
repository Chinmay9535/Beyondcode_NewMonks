// Lip-sync from ElevenLabs character alignment
const files: Record<string, any> = {};
const ctx = (require as any).context('../align', false, /\.align\.json$/);
ctx.keys().forEach((k: string) => { files[k.replace('./', '').replace('.align.json', '')] = ctx(k); });

const OPEN: Record<string, number> = {a: 0.85, o: 0.75, e: 0.6, i: 0.45, u: 0.5, y: 0.4, h: 0.35, r: 0.35, l: 0.35, w: 0.3, s: 0.2, z: 0.2, t: 0.25, d: 0.3, n: 0.25, k: 0.3, g: 0.3, c: 0.25, j: 0.3, f: 0.15, v: 0.15, m: 0.0, b: 0.0, p: 0.0};

/** mouth openness 0..1 and speech energy at scene-local time t (seconds, relative to clip start) */
export const mouth = (id: string, t: number): {open: number; energy: number} => {
  const a = files[id];
  if (!a) return {open: 0, energy: 0};
  const ch: string[] = a.characters, st: number[] = a.character_start_times_seconds, en: number[] = a.character_end_times_seconds;
  let open = 0, energy = 0, n = 0;
  for (const dt of [-0.05, -0.025, 0, 0.025, 0.05]) {
    const tt = t + dt;
    let v = 0;
    let intag = false;
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (c === '[') intag = true;
      if (intag) { if (c === ']') intag = false; continue; }
      if (tt >= st[i] && tt < en[i]) { v = OPEN[c.toLowerCase()] ?? 0; break; }
    }
    open += v; n++;
  }
  open /= n;
  // energy: talking activity over the last 0.6 s
  let act = 0;
  for (let k = 0; k < 6; k++) { const tt = t - k * 0.1; for (let i = 0; i < ch.length; i++) if (tt >= st[i] && tt < en[i] && /[a-z]/i.test(ch[i])) { act++; break; } }
  energy = act / 6;
  return {open, energy};
};
