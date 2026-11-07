// Home acuity test: screen calibration, optotype sizing and the staircase.

export const CARD_MM = 85.6; // ISO/IEC 7810 ID-1 card width (bank, Aadhaar-size cards)
const KEY = "ds-px-per-mm";

export const calibration = {
  get(): number | null { try { const v = Number(localStorage.getItem(KEY)); return v > 1 ? v : null; } catch { return null; } },
  set(v: number) { try { localStorage.setItem(KEY, String(v)); } catch {} },
};

/** Letter height in CSS px for a logMAR level at a viewing distance. The tumbling E is 5 MAR tall. */
export function optotypePx(logmar: number, distanceCm: number, pxPerMm: number): number {
  const marArcmin = Math.pow(10, logmar);
  const heightMm = distanceCm * 10 * Math.tan(((5 * marArcmin) / 60) * (Math.PI / 180));
  return heightMm * pxPerMm;
}

export type Dir = "right" | "up" | "left" | "down";
export const DIRS: Dir[] = ["right", "up", "left", "down"];
export const ROTATE: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

export type Trial = { level: number; shown: Dir; answer: Dir | "none"; correct: boolean };
export type Stair = {
  phase: "coarse" | "fine" | "done";
  level: number;
  correct: number;
  wrong: number;
  lastPassed: number | null;
  failed: number | null;
  shown: Dir;
  trials: Trial[];
};

const COARSE_START = 1.0, COARSE_STEP = 0.3, FINE_STEP = 0.1, FLOOR = -0.2;
const PASS = 3, FAIL = 2; // a level passes at 3 correct before 2 wrong: ~5% chance by guessing (4 choices)
const r1 = (v: number) => Math.round(v * 10) / 10;

function nextDir(prev?: Dir): Dir {
  const options = DIRS.filter((d) => d !== prev);
  return options[Math.floor(Math.random() * options.length)];
}

export function startStair(): Stair {
  return { phase: "coarse", level: COARSE_START, correct: 0, wrong: 0, lastPassed: null, failed: null, shown: nextDir(), trials: [] };
}

/** Coarse 0.3 steps until the first failed level, then 0.1 steps down from the last passed level. */
export function answer(s: Stair, a: Dir | "none"): Stair {
  if (s.phase === "done") return s;
  const ok = a === s.shown;
  const trials = [...s.trials, { level: s.level, shown: s.shown, answer: a, correct: ok }];
  const correct = s.correct + (ok ? 1 : 0), wrong = s.wrong + (ok ? 0 : 1);
  const fresh = (level: number, extra: Partial<Stair>): Stair => ({ ...s, ...extra, level: r1(level), correct: 0, wrong: 0, trials, shown: nextDir(s.shown) });

  if (correct >= PASS) {
    const step = s.phase === "coarse" ? COARSE_STEP : FINE_STEP;
    const next = r1(s.level - step);
    if (next < FLOOR - 1e-9 || (s.failed !== null && next <= s.failed + 1e-9)) {
      return { ...s, phase: "done", lastPassed: s.level, trials };
    }
    return fresh(next, { lastPassed: s.level });
  }
  if (wrong >= FAIL) {
    if (s.phase === "coarse" && s.lastPassed !== null) {
      const next = r1(s.lastPassed - FINE_STEP);
      if (next <= s.level + 1e-9) return { ...s, phase: "done", failed: s.level, trials };
      return fresh(next, { phase: "fine", failed: s.level });
    }
    return { ...s, phase: "done", failed: s.level, trials };
  }
  return { ...s, correct, wrong, trials, shown: nextDir(s.shown) };
}

/** Final acuity in logMAR. Failing the largest letter is recorded as 1.1 (worse than 6/60). */
export const result = (s: Stair) => (s.lastPassed ?? 1.1);

const LINES: [string, number][] = [["6/4", -0.18], ["6/5", -0.08], ["6/6", 0], ["6/7.5", 0.1], ["6/9", 0.18], ["6/12", 0.3], ["6/15", 0.4], ["6/18", 0.48], ["6/24", 0.6], ["6/36", 0.78], ["6/60", 1.0]];
/** Nearest standard Snellen line, as written in Indian clinics. */
export const snellen = (logmar: number) => (logmar > 1.05 ? "<6/60" : LINES.reduce((a, b) => (Math.abs(b[1] - logmar) < Math.abs(a[1] - logmar) ? b : a))[0]);
