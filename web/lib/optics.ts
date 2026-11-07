// Client-side mirror of the backend optics (backend/app/services/lenses.py), for the simulator and chart.

export function interp(curve: [number, number][], x: number): number {
  const pts = [...curve].sort((a, b) => b[0] - a[0]);
  if (x >= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x0 - x)) / (x0 - x1);
  }
  return pts[pts.length - 1][1];
}

export const vergence = (cm: number) => -100 / Math.max(cm, 10);

/** Rough visual blur for a predicted logMAR (0 = 6/6). Tuned for a ~900px wide view. */
export const blurPx = (logmar: number) => Math.max(0, logmar - 0.04) * 13;

export const DISTANCES = { far: 600, arm: 66, near: 40 } as const;
