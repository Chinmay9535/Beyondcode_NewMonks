"use client";

import { Camera, Image as ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Curve, Lang } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { DISTANCES, blurPx, interp, vergence } from "@/lib/optics";
import { cx } from "./ui";

const SW = 1600, SH = 900;
type Light = { x: number; y: number; r: number; c: string };
type Scene = { far: HTMLCanvasElement; near: HTMLCanvasElement; lights: Light[] };

const CATARACT = { far: "blur(5px) sepia(.55) saturate(.7) contrast(.75) brightness(.92)", near: "blur(6px) sepia(.5) contrast(.8)", veil: 1 };

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}

function buildScene(): Scene {
  const rnd = rng(7), lights: Light[] = [];
  const far = document.createElement("canvas"), near = document.createElement("canvas");
  far.width = near.width = SW; far.height = near.height = SH;
  const g = far.getContext("2d")!, HZ = 520;
  const sky = g.createLinearGradient(0, 0, 0, HZ); sky.addColorStop(0, "#02060d"); sky.addColorStop(0.7, "#0b1824"); sky.addColorStop(1, "#2a2622");
  g.fillStyle = sky; g.fillRect(0, 0, SW, HZ);
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`; g.fillRect(rnd() * SW, rnd() * 360, 1.6, 1.6); }
  let x = 0;
  while (x < SW) {
    const w = 60 + rnd() * 120, h = 70 + rnd() * 230; g.fillStyle = "#060c13"; g.fillRect(x, HZ - h, w, h);
    for (let wy = HZ - h + 12; wy < HZ - 14; wy += 18) for (let wx = x + 10; wx < x + w - 10; wx += 16) if (rnd() < 0.2) { g.fillStyle = `rgba(244,194,122,${0.45 + rnd() * 0.4})`; g.fillRect(wx, wy, 7, 10); }
    x += w + 4 + rnd() * 10;
  }
  g.fillStyle = "#0a0f14"; g.fillRect(0, HZ, SW, SH - HZ);
  g.fillStyle = "#14191e"; g.beginPath(); g.moveTo(770, HZ); g.lineTo(830, HZ); g.lineTo(1560, SH); g.lineTo(40, SH); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 3; g.beginPath(); g.moveTo(770, HZ); g.lineTo(40, SH); g.moveTo(830, HZ); g.lineTo(1560, SH); g.stroke();
  g.fillStyle = "rgba(240,230,200,.7)";
  for (let i = 0; i < 9; i++) {
    const t0 = Math.pow(i / 9, 1.6), t1 = Math.pow((i + 0.45) / 9, 1.6);
    const ya = HZ + t0 * (SH - HZ), yb = HZ + t1 * (SH - HZ), wa = 2 + t0 * 14, wb = 2 + t1 * 14;
    g.beginPath(); g.moveTo(800 - wa / 2, ya); g.lineTo(800 + wa / 2, ya); g.lineTo(800 + wb / 2, yb); g.lineTo(800 - wb / 2, yb); g.fill();
  }
  [0.12, 0.24, 0.4, 0.62, 0.9].forEach((t) => {
    const y = HZ + t * (SH - HZ);
    ([[lerp(765, 40, t) - 50 * t, -1], [lerp(835, 1560, t) + 50 * t, 1]] as [number, number][]).forEach(([px, side]) => {
      if (side < 0 && t > 0.5) return;
      const h = 24 + 300 * t, r = 3 + 9 * t;
      g.strokeStyle = "#1d262f"; g.lineWidth = 1 + 4 * t; g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - h); g.lineTo(px - side * 28 * t, y - h); g.stroke();
      g.fillStyle = "#ffe2b0"; g.beginPath(); g.arc(px - side * 28 * t, y - h, r, 0, 7); g.fill();
      lights.push({ x: px - side * 28 * t, y: y - h, r, c: "255,214,160" });
    });
  });
  const cy1 = HZ + 0.28 * (SH - HZ); g.fillStyle = "#0b0e12"; g.fillRect(852, cy1 - 26, 70, 30);
  [[862, cy1 - 8], [912, cy1 - 8]].forEach(([lx, ly]) => { g.fillStyle = "#f4f8ff"; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.fill(); lights.push({ x: lx, y: ly, r: 7, c: "235,242,255" }); });
  const cy2 = HZ + 0.45 * (SH - HZ); g.fillStyle = "#0b0e12"; g.fillRect(610, cy2 - 40, 110, 46);
  [[624, cy2 - 14], [706, cy2 - 14]].forEach(([lx, ly]) => { g.fillStyle = "#ff4b3e"; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.fill(); lights.push({ x: lx, y: ly, r: 7, c: "255,80,60" }); });
  const sx = 1010, sy = HZ + 0.2 * (SH - HZ); g.strokeStyle = "#1d262f"; g.lineWidth = 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 150); g.stroke();
  g.fillStyle = "#0d1217"; g.fillRect(sx - 14, sy - 210, 28, 66); g.fillStyle = "#4dffaa"; g.beginPath(); g.arc(sx, sy - 158, 8, 0, 7); g.fill(); lights.push({ x: sx, y: sy - 158, r: 8, c: "90,255,170" });
  g.fillStyle = "#1d262f"; g.fillRect(1120, 330, 8, 190); g.fillRect(1392, 330, 8, 190);
  g.fillStyle = "#0f6b45"; g.strokeStyle = "#e9f0ef"; g.lineWidth = 5; rr(g, 1080, 250, 360, 150, 12); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.font = "700 62px Geist, system-ui, sans-serif"; g.fillText("MYSURU", 1108, 322);
  g.font = "600 40px Geist, system-ui, sans-serif"; g.fillText("12 km  →", 1112, 378);

  const n = near.getContext("2d")!; n.save(); n.translate(400, 742); n.rotate(-0.06);
  n.shadowColor = "rgba(0,0,0,.6)"; n.shadowBlur = 40; n.fillStyle = "#efe7d6"; rr(n, -290, -160, 580, 320, 16); n.fill(); n.shadowBlur = 0;
  n.fillStyle = "#8a5a2b"; n.font = '600 22px "Geist Mono", monospace'; n.fillText("POST-OP DROPS · RIGHT EYE", -256, -112);
  n.fillStyle = "#22201c"; n.font = "600 27px Geist, system-ui, sans-serif";
  n.fillText("Antibiotic drops", -256, -58); n.fillText("1 drop · 4× a day", 40, -58);
  n.fillText("Anti-inflammatory", -256, -12); n.fillText("1 drop · 3× a day", 40, -12);
  n.font = "500 21px Geist, system-ui, sans-serif"; n.fillStyle = "#4a453c";
  n.fillText("Do not rub the eye. Wear the shield at night.", -256, 40); n.fillText("Next check-up: day 7 · Bring this card.", -256, 74);
  n.strokeStyle = "#b9ad95"; n.lineWidth = 2; n.beginPath(); n.moveTo(-256, -90); n.lineTo(256, -90); n.stroke(); n.restore();
  return { far, near, lights };
}

/** halo: 0..1 from the lens data; "cataract" draws the forward-scatter bloom of a cloudy lens. */
function drawHalo(cv: HTMLCanvasElement, halo: number | "cataract", lights: Light[]) {
  const g = cv.getContext("2d")!; g.clearRect(0, 0, SW, SH); g.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const glow = (rad: number, a: number) => { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, rad); gr.addColorStop(0, `rgba(${l.c},${a})`); gr.addColorStop(0.35, `rgba(${l.c},${a * 0.35})`); gr.addColorStop(1, `rgba(${l.c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(l.x, l.y, rad, 0, 7); g.fill(); };
    const ring = (rad: number, a: number, w: number) => { g.strokeStyle = `rgba(${l.c},${a})`; g.lineWidth = w; g.beginPath(); g.arc(l.x, l.y, rad, 0, 7); g.stroke(); };
    if (halo === "cataract") { glow(l.r * 12, 0.55); glow(l.r * 4, 0.5); continue; }
    glow(l.r * (2.2 + 2 * halo), 0.25 + 0.3 * halo);
    if (halo >= 0.2) ring(l.r * (3 + 1.2 * halo), 0.1 + 0.4 * halo, Math.max(1.2, l.r * 0.4));
    if (halo >= 0.45) ring(l.r * 5.4, 0.36 * halo, Math.max(1.2, l.r * 0.35));
  }
  g.globalCompositeOperation = "source-over";
}

type Look = { far: string; near: string; veil: number; halo: number | "cataract" };
function lookFor(curve: Curve | null, nearCm: number): Look {
  if (!curve) return { ...CATARACT, halo: "cataract" };
  const f = blurPx(interp(curve.curve, vergence(DISTANCES.far)));
  const n = blurPx(interp(curve.curve, vergence(nearCm)));
  return { far: f > 0.2 ? `blur(${f.toFixed(1)}px)` : "none", near: n > 0.2 ? `blur(${n.toFixed(1)}px)` : "none", veil: 0, halo: curve.halo };
}

function Stack({ scene, look, className }: { scene: Scene | null; look: Look; className?: string }) {
  const farR = useRef<HTMLCanvasElement>(null), nearR = useRef<HTMLCanvasElement>(null), haloR = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (!scene) return; farR.current!.getContext("2d")!.drawImage(scene.far, 0, 0); nearR.current!.getContext("2d")!.drawImage(scene.near, 0, 0); }, [scene]);
  useEffect(() => { if (scene) drawHalo(haloR.current!, look.halo, scene.lights); }, [scene, look.halo]);
  const cv = "absolute inset-0 h-full w-full";
  return (
    <div className={cx("absolute inset-0", className)}>
      <canvas ref={farR} width={SW} height={SH} className={cv} style={{ filter: look.far }} />
      <div className="absolute inset-0" style={{ opacity: look.veil, background: "radial-gradient(ellipse at 50% 45%, rgba(255,236,200,.18), rgba(190,160,110,.28))", mixBlendMode: "screen" }} />
      <canvas ref={haloR} width={SW} height={SH} className={cv} style={{ filter: look.halo === "cataract" ? "blur(3px)" : "blur(.5px)" }} />
      <canvas ref={nearR} width={SW} height={SH} className={cv} style={{ filter: look.near }} />
    </div>
  );
}

export default function Simulator({ curves, families, initial, lang, nearCm = 40, labels }: {
  curves: Record<string, Curve>; families: string[]; initial?: string; lang: Lang; nearCm?: number; labels?: Record<string, string>;
}) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [fam, setFam] = useState(initial || families[0]);
  const [pos, setPos] = useState(50);
  const [cam, setCam] = useState(false);
  const [camDist, setCamDist] = useState<keyof typeof DISTANCES>("near");
  const [camErr, setCamErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null), drag = useRef(false);
  const vidL = useRef<HTMLVideoElement>(null), vidR = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ready = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
    ready.then(() => setScene(buildScene()));
  }, []);
  useEffect(() => { if (initial) setFam(initial); }, [initial]);

  useEffect(() => {
    if (!cam) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; return; }
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => { stream.current = s; [vidL.current, vidR.current].forEach((v) => { if (v) { v.srcObject = s; v.play().catch(() => {}); } }); setCamErr(null); })
      .catch((e) => { setCamErr(String(e?.message || e)); setCam(false); });
    return () => { stream.current?.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  const curve = curves[fam] || null;
  const look = lookFor(curve, nearCm);
  const camBlur = curve ? blurPx(interp(curve.curve, vergence(DISTANCES[camDist]))) : 0;
  const clamp = (p: number) => Math.max(3, Math.min(97, p));
  const fromEvt = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); setPos(clamp(((e.clientX - r.left) / r.width) * 100)); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Lens type">
        {families.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={fam === k} onClick={() => setFam(k)}
            className={cx("min-h-11 rounded-full border px-4 text-[15px] font-medium transition", fam === k ? "border-accent bg-accent text-on-accent" : "border-line bg-surface hover:border-muted")}>
            {labels?.[k] || curves[k]?.name || k}
          </button>
        ))}
        <button type="button" onClick={() => setCam(!cam)} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[14px] text-muted hover:text-ink">
          {cam ? <ImageIcon size={16} /> : <Camera size={16} />} {cam ? tr(lang, "useScene") : tr(lang, "useCamera")}
        </button>
      </div>
      {cam && (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="text-muted">{tr(lang, "cameraAt")}</span>
          {(Object.keys(DISTANCES) as (keyof typeof DISTANCES)[]).map((d) => (
            <button key={d} type="button" onClick={() => setCamDist(d)} className={cx("min-h-9 rounded-full border px-3", camDist === d ? "border-sky text-sky" : "border-line text-muted")}>{tr(lang, d)}</button>
          ))}
        </div>
      )}
      {camErr && <p className="text-[13px] text-danger">{camErr}</p>}
      <div
        ref={box}
        className="relative aspect-video w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl border border-line bg-black"
        onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromEvt(e); }}
        onPointerMove={(e) => drag.current && fromEvt(e)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
      >
        {cam ? (
          <>
            <video ref={vidL} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ filter: CATARACT.far }} />
            <video ref={vidR} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ filter: camBlur > 0.2 ? `blur(${camBlur.toFixed(1)}px)` : "none", clipPath: `inset(0 0 0 ${pos}%)` }} />
          </>
        ) : (
          <>
            <Stack scene={scene} look={{ ...CATARACT, halo: "cataract" }} />
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
              <Stack scene={scene} look={look} />
            </div>
          </>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[.1em] text-white">{tr(lang, "today")}</span>
        <span className="absolute right-3 top-3 rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[.1em] text-[#FF8A5B]">{tr(lang, "afterSurgery")} · {labels?.[fam] || curve?.name}</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }}>
          <button
            type="button"
            className="pointer-events-auto absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg"
            aria-label={tr(lang, "dragCompare")}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => clamp(p - 5)); } if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => clamp(p + 5)); } }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">{tr(lang, "dragCompare")}. {tr(lang, "illustrative")}</p>
    </div>
  );
}
