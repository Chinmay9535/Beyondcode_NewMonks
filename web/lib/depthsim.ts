// Depth-aware lens simulation on a real photo.
//
// The depth model returns relative *inverse* depth (disparity), which is affine in
// 1/distance, i.e. in dioptres. So two anchors (nearest and farthest distance in the photo)
// map each pixel exactly to the vergence the eye must focus at. Each lens's defocus curve
// then gives the predicted acuity at that vergence, and that sets the blur for that pixel.
import { interp } from "./optics";

export type Depth = { w: number; h: number; data: Uint8Array };

/** Separable box blur, three passes (close to a Gaussian). RGBA in, RGBA out. */
export function blur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  if (r < 0.5) return src;
  const rad = Math.max(1, Math.round(r / 1.7)); // 3 box passes of radius rad ~ Gaussian sigma ~ r/2
  let a = new Uint8ClampedArray(src), b = new Uint8ClampedArray(src.length);
  const pass = (from: Uint8ClampedArray, to: Uint8ClampedArray, horizontal: boolean) => {
    const len = horizontal ? w : h, lines = horizontal ? h : w, win = rad * 2 + 1;
    for (let line = 0; line < lines; line++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        const idx = (i: number) => {
          const k = Math.min(len - 1, Math.max(0, i));
          return (horizontal ? line * w + k : k * w + line) * 4 + c;
        };
        for (let i = -rad; i <= rad; i++) acc += from[idx(i)];
        for (let i = 0; i < len; i++) {
          to[idx(i)] = acc / win;
          acc += from[idx(i + rad + 1)] - from[idx(i - rad)];
        }
      }
      for (let i = 0; i < len; i++) { const o = (horizontal ? line * w + i : i * w + line) * 4 + 3; to[o] = from[o]; }
    }
  };
  for (let k = 0; k < 3; k++) { pass(a, b, true); pass(b, a, false); }
  return a;
}

export const RADII = [0, 1, 2, 3.5, 5, 7, 10, 14, 19];

export function pyramid(img: ImageData): Uint8ClampedArray[] {
  return RADII.map((r) => blur(img.data, img.width, img.height, r));
}

/** Normalised depth (0 = farthest, 1 = nearest) using robust 2nd/98th percentiles. */
export function normalise(d: Depth, w: number, h: number): Float32Array {
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.data.length; i++) hist[d.data[i]]++;
  const pct = (q: number) => { let acc = 0; const target = d.data.length * q; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; } return 255; };
  const lo = pct(0.02), hi = Math.max(lo + 1, pct(0.98));
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(d.h - 1, Math.floor((y / h) * d.h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(d.w - 1, Math.floor((x / w) * d.w));
      out[y * w + x] = Math.min(1, Math.max(0, (d.data[sy * d.w + sx] - lo) / (hi - lo)));
    }
  }
  return out;
}

export type Anchors = { nearCm: number; farCm: number };
const D = (cm: number) => -100 / cm;

/** Per-pixel blur radius (px) for a lens curve. `pupil` scales blur (night pupils are wider). */
export function radiusMap(t: Float32Array, curve: [number, number][] | null, anchors: Anchors, pxScale: number, pupil = 1, constantLogmar?: number): Float32Array {
  const lut = new Float32Array(256);
  const vNear = D(anchors.nearCm), vFar = D(anchors.farCm);
  for (let i = 0; i < 256; i++) {
    const v = vFar + (i / 255) * (vNear - vFar);
    const lm = constantLogmar ?? (curve ? interp(curve, v) : 0);
    lut[i] = Math.max(0, lm - 0.04) * 13 * pxScale * pupil;
  }
  const out = new Float32Array(t.length);
  for (let i = 0; i < t.length; i++) out[i] = lut[Math.round(t[i] * 255)];
  return out;
}

/** Composite: each pixel blends the two pyramid levels around its blur radius. */
export function compose(pyr: Uint8ClampedArray[], w: number, h: number, radius: Float32Array, tint?: (rgb: [number, number, number]) => [number, number, number]): ImageData {
  const out = new ImageData(w, h);
  const o = out.data, last = RADII.length - 1;
  for (let p = 0; p < w * h; p++) {
    const r = Math.min(RADII[last], radius[p]);
    let k = 0;
    while (k < last - 1 && RADII[k + 1] < r) k++;
    const f = Math.min(1, Math.max(0, (r - RADII[k]) / (RADII[k + 1] - RADII[k])));
    const a = pyr[k], b = pyr[k + 1], i = p * 4;
    let rr = a[i] + (b[i] - a[i]) * f, gg = a[i + 1] + (b[i + 1] - a[i + 1]) * f, bb = a[i + 2] + (b[i + 2] - a[i + 2]) * f;
    if (tint) [rr, gg, bb] = tint([rr, gg, bb]);
    o[i] = rr; o[i + 1] = gg; o[i + 2] = bb; o[i + 3] = 255;
  }
  return out;
}

/** A cataract: forward scatter (veil), yellowing, lower contrast. */
export const cataractTint = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const veil = 38;
  return [r * 0.78 + veil + 10, g * 0.74 + veil + 2, b * 0.5 + veil - 14];
};

export type Light = { x: number; y: number; r: number; c: [number, number, number] };

/** Compact bright light sources (street lamps, headlamps, signals), found on a coarse grid.
 * Large bright areas (sky, white cars) are not lights and are skipped. */
export function findLights(img: ImageData, cell = 8): Light[] {
  const { width: w, height: h, data } = img;
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const hot = new Float32Array(cols * rows);
  const col: [number, number, number][] = new Array(cols * rows);
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    let n = 0, sr = 0, sg = 0, sb = 0;
    for (let y = gy * cell; y < Math.min(h, gy * cell + cell); y++) for (let x = gx * cell; x < Math.min(w, gx * cell + cell); x++) {
      const i = (y * w + x) * 4, l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l > 245) { n++; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; }
    }
    hot[gy * cols + gx] = n / (cell * cell);
    col[gy * cols + gx] = n ? [sr / n, sg / n, sb / n] : [255, 255, 255];
  }
  // Connected blobs of hot cells; keep small ones (a light), drop big ones (a bright surface).
  const seen = new Uint8Array(cols * rows), lights: (Light & { area: number })[] = [];
  for (let k = 0; k < hot.length; k++) {
    if (seen[k] || hot[k] < 0.3) continue;
    const stack = [k], cells: number[] = [];
    seen[k] = 1;
    while (stack.length) {
      const c = stack.pop()!; cells.push(c);
      const cx = c % cols, cy = (c / cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, nk = ny * cols + nx;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[nk] && hot[nk] >= 0.3) { seen[nk] = 1; stack.push(nk); }
      }
    }
    if (cells.length > 40) continue; // a lamp glow can cover a few cells; a white wall or car body is bigger
    const x = cells.reduce((a, c) => a + (c % cols), 0) / cells.length, y = cells.reduce((a, c) => a + ((c / cols) | 0), 0) / cells.length;
    lights.push({ x: (x + 0.5) * cell, y: (y + 0.5) * cell, r: Math.min(8, 2 + Math.sqrt(cells.length) * 2), c: col[cells[0]], area: cells.length });
  }
  return lights.sort((a, b) => b.area - a.area).slice(0, 30);
}

/** Halos and glare around lights. halo: lens halo level 0-1, or "cataract" for the bloom of a cloudy lens. */
export function drawHalos(ctx: CanvasRenderingContext2D, lights: Light[], halo: number | "cataract", scale: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const c = `${l.c[0] | 0},${l.c[1] | 0},${l.c[2] | 0}`;
    const glow = (rad: number, a: number) => {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, rad);
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(0.35, `rgba(${c},${a * 0.35})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, 7); ctx.fill();
    };
    const ring = (rad: number, a: number, w: number) => { ctx.strokeStyle = `rgba(${c},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, 7); ctx.stroke(); };
    const r = Math.max(2.5, Math.min(8, l.r)) * scale;
    if (halo === "cataract") { glow(r * 6, 0.3); glow(r * 2.2, 0.35); continue; }
    glow(r * (1.6 + 1.6 * halo), 0.12 + 0.25 * halo);
    if (halo >= 0.2) ring(r * (2.4 + 1.2 * halo), 0.1 + 0.4 * halo, Math.max(0.8, r * 0.22));
    if (halo >= 0.45) ring(r * 4.2, 0.22 * halo, Math.max(0.8, r * 0.18));
  }
  ctx.restore();
}
