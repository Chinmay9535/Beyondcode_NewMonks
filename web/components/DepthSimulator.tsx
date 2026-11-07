"use client";

import { Camera, ImagePlus, Moon, ScanLine, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/api";
import { type Anchors, type Depth, type Light, cataractTint, compose, drawHalos, findLights, normalise, pyramid, radiusMap } from "@/lib/depthsim";
import { tr } from "@/lib/i18n";
import type { Look } from "./Simulator";
import { Button, cx } from "./ui";

const MAX_W = 640;
const CATARACT_LOGMAR = 0.6;
const NIGHT_PUPIL = 1.5; // pupil ~3 mm by day, ~4.5 mm at night: geometric blur scales with pupil size

type Photo = { img: ImageData; w: number; h: number; url: string };
type Status = { kind: "idle" | "loading" | "measuring" | "ready" | "fallback"; progress?: number; device?: string; ms?: number; error?: string };

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new Worker("/depth-worker.js", { type: "module" });
  return worker;
}

async function loadPhoto(file: Blob): Promise<Photo> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bmp.width);
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return { img: ctx.getImageData(0, 0, w, h), w, h, url: c.toDataURL("image/jpeg", 0.9) };
}

function estimateDepth(blob: Blob, onProgress: (p: number) => void): Promise<Depth & { device: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = Math.random().toString(36).slice(2);
    const files: Record<string, { loaded: number; total: number }> = {};
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === "progress" && m.file && m.total) {
        files[m.file] = { loaded: m.loaded || 0, total: m.total };
        const all = Object.values(files);
        onProgress(Math.round((100 * all.reduce((a, f) => a + f.loaded, 0)) / Math.max(1, all.reduce((a, f) => a + f.total, 0))));
      } else if (m.type === "result") {
        w.removeEventListener("message", onMsg);
        resolve({ w: m.width, h: m.height, data: m.data, device: m.device, ms: m.ms });
      } else if (m.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(m.message));
      }
    };
    w.addEventListener("message", onMsg);
    w.addEventListener("error", (ev) => reject(new Error(ev.message || "worker failed")), { once: true });
    w.postMessage({ id, blob });
  });
}

export default function DepthSimulator({ looks, initial, lang }: { looks: Look[]; initial?: string; lang: Lang }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [depthT, setDepthT] = useState<Float32Array | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [lookKey, setLookKey] = useState(initial || looks[0]?.key);
  const [anchors, setAnchors] = useState<Anchors>({ nearCm: 40, farCm: 600 });
  const [night, setNight] = useState(false);
  const [showDepth, setShowDepth] = useState(false);
  const [pos, setPos] = useState(50);
  const left = useRef<HTMLCanvasElement>(null), right = useRef<HTMLCanvasElement>(null), depthC = useRef<HTMLCanvasElement>(null);
  const cam = useRef<HTMLInputElement>(null), gal = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null), drag = useRef(false);

  useEffect(() => { if (initial) setLookKey(initial); }, [initial]);
  const look = looks.find((l) => l.key === lookKey) || looks[0];

  const onFile = useCallback(async (file?: File | null) => {
    if (!file) return;
    setDepthT(null); setShowDepth(false);
    const p = await loadPhoto(file);
    setPhoto(p);
    setStatus({ kind: "loading", progress: 0 });
    try {
      const blob = await (await fetch(p.url)).blob();
      const d = await estimateDepth(blob, (pr) => setStatus((s) => (s.kind === "loading" ? { ...s, progress: pr } : s)));
      setStatus({ kind: "measuring" });
      setDepthT(normalise(d, p.w, p.h));
      setStatus({ kind: "ready", device: d.device, ms: d.ms });
    } catch (e) {
      setDepthT(new Float32Array(p.w * p.h).fill(1)); // whole photo at the nearest distance
      setStatus({ kind: "fallback", error: String((e as Error).message || e) });
    }
  }, []);

  const pyr = useMemo(() => (photo ? pyramid(photo.img) : null), [photo]);
  const lights: Light[] = useMemo(() => (photo ? findLights(photo.img) : []), [photo]);
  const pxScale = photo ? photo.w / 900 : 1;

  // Draw "today" (cataract) and "after" (selected lens) whenever inputs change.
  useEffect(() => {
    if (!photo || !pyr || !depthT || !left.current || !right.current) return;
    const pupil = night ? NIGHT_PUPIL : 1;
    const today = compose(pyr, photo.w, photo.h, radiusMap(depthT, null, anchors, pxScale, pupil, CATARACT_LOGMAR), cataractTint);
    const lctx = left.current.getContext("2d")!;
    lctx.putImageData(today, 0, 0);
    drawHalos(lctx, lights, "cataract", pxScale * 1.4);
    const after = compose(pyr, photo.w, photo.h, radiusMap(depthT, look?.curve || null, anchors, pxScale, pupil));
    const rctx = right.current.getContext("2d")!;
    rctx.putImageData(after, 0, 0);
    if (night) drawHalos(rctx, lights, look?.halo ?? 0, pxScale * 1.4);
  }, [photo, pyr, depthT, anchors, night, look, lights, pxScale]);

  useEffect(() => {
    if (!photo || !depthT || !depthC.current || !showDepth) return;
    const img = new ImageData(photo.w, photo.h);
    for (let i = 0; i < depthT.length; i++) {
      const t = depthT[i]; // near = warm, far = cool
      img.data[i * 4] = 40 + 215 * t; img.data[i * 4 + 1] = 80 + 60 * (1 - Math.abs(t - 0.5) * 2); img.data[i * 4 + 2] = 230 - 200 * t; img.data[i * 4 + 3] = 255;
    }
    depthC.current.getContext("2d")!.putImageData(img, 0, 0);
  }, [photo, depthT, showDepth]);

  const clamp = (p: number) => Math.max(3, Math.min(97, p));
  const fromEvt = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); setPos(clamp(((e.clientX - r.left) / r.width) * 100)); };
  const chip = (on: boolean) => cx("min-h-9 rounded-full border px-3 text-[13px]", on ? "border-sky bg-sky-bg text-sky" : "border-line text-muted");

  const pickers = (
    <div className="flex flex-wrap gap-2">
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} aria-label={tr(lang, "choosePhoto")} />
      <Button size={photo ? "sm" : "lg"} onClick={() => cam.current?.click()}><Camera size={18} /> {photo ? tr(lang, "newPhoto") : tr(lang, "takePhoto")}</Button>
      <Button size={photo ? "sm" : "lg"} variant="soft" onClick={() => gal.current?.click()}><ImagePlus size={18} /> {tr(lang, "choosePhoto")}</Button>
    </div>
  );

  if (!photo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[16px] leading-relaxed text-muted">{tr(lang, "photoHint")}</p>
        {pickers}
        <p className="text-[12.5px] text-muted">🔒 {tr(lang, "photoPrivate")}</p>
      </div>
    );
  }

  const ready = status.kind === "ready" || status.kind === "fallback";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Lens plan">
        {looks.map((l) => (
          <button key={l.key} type="button" role="tab" aria-selected={look?.key === l.key} onClick={() => setLookKey(l.key)}
            className={cx("min-h-10 rounded-full border px-3.5 text-left text-[14px] font-medium", look?.key === l.key ? "border-accent bg-accent text-on-accent" : "border-line bg-surface")}>{l.name}</button>
        ))}
      </div>

      <div ref={box} className="relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl border border-line bg-black"
        style={{ aspectRatio: `${photo.w} / ${photo.h}` }}
        onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromEvt(e); }}
        onPointerMove={(e) => drag.current && fromEvt(e)} onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!ready && <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <canvas ref={left} width={photo.w} height={photo.h} className={cx("absolute inset-0 h-full w-full", !ready && "hidden")} />
        <canvas ref={right} width={photo.w} height={photo.h} className={cx("absolute inset-0 h-full w-full", !ready && "hidden")} style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
        {showDepth && <canvas ref={depthC} width={photo.w} height={photo.h} className="absolute inset-0 h-full w-full opacity-90" />}
        {ready && !showDepth && (
          <>
            <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2.5 py-1.5 text-[12px] font-medium text-white">{tr(lang, "today")}</span>
            <span className="absolute right-3 top-3 max-w-[58%] truncate rounded-lg bg-black/70 px-2.5 py-1.5 text-[12px] font-medium text-[#FF8A5B]">{tr(lang, "afterSurgery")} · {look?.name}</span>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }}>
              <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
              </span>
            </div>
          </>
        )}
        {!ready && (
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/75 px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-[15px]"><ScanLine size={18} className="animate-pulse" /> {status.kind === "loading" && status.progress != null && status.progress < 100 ? tr(lang, "downloading", { p: status.progress }) : tr(lang, "measuring")}</p>
            {status.kind === "loading" && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-[#FF6F37] transition-all" style={{ width: `${status.progress || 3}%` }} /></div>}
          </div>
        )}
      </div>

      {ready && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setNight(false)} className={chip(!night)} aria-pressed={!night}><Sun size={14} className="mr-1 inline" />{tr(lang, "dayLight")}</button>
            <button type="button" onClick={() => setNight(true)} className={chip(night)} aria-pressed={night}><Moon size={14} className="mr-1 inline" />{tr(lang, "nightLight")}</button>
            {status.kind === "ready" && <button type="button" onClick={() => setShowDepth(!showDepth)} className={cx(chip(showDepth), "ml-auto")} aria-pressed={showDepth}>{tr(lang, "showDepth")}</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">{tr(lang, "nearestIs")}:</span>
            {[33, 40, 66, 150].map((cm) => <button key={cm} type="button" onClick={() => setAnchors({ ...anchors, nearCm: cm })} className={chip(anchors.nearCm === cm)}>{cm < 100 ? `${cm} cm` : `${cm / 100} m`}</button>)}
          </div>
          {status.kind === "ready" && (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted">{tr(lang, "farthestIs")}:</span>
              {([[600, "farAway"], [300, "acrossRoom"], [90, "onTable"]] as const).map(([cm, k]) => <button key={cm} type="button" onClick={() => setAnchors({ ...anchors, farCm: cm })} className={chip(anchors.farCm === cm)}>{tr(lang, k)}</button>)}
            </div>
          )}
          {status.kind === "fallback" && <p className="rounded-2xl bg-warn-bg px-4 py-3 text-[13px] text-warn">{tr(lang, "depthFailed")}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {pickers}
            {status.kind === "ready" && <span className="font-mono text-[11px] text-muted">Depth Anything V2 · {status.device} · {status.ms} ms</span>}
          </div>
          <p className="text-[12.5px] text-muted">🔒 {tr(lang, "photoPrivate")} {tr(lang, "illustrative")}</p>
        </div>
      )}
    </div>
  );
}
