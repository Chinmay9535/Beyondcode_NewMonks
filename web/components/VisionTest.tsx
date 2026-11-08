"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Grid3x3, Ruler, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Clinic, Lang, Message, VisionResult } from "@/lib/api";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { CARD_MM, ROTATE, answer, calibration, optotypePx, result, snellen, startStair, type Dir, type Stair } from "@/lib/vision";
import { MessageList } from "./Chat";
import { Badge, Button, Card, Spinner, cx } from "./ui";

type Kind = "distance" | "near" | "amsler";
type Step = "menu" | "calibrate" | "eye" | "test" | "result";
const DIST: Record<Kind, number> = { distance: 200, near: 40, amsler: 30 };

/** Tumbling E drawn on a 5x5 grid (arms pointing right), rotated to `dir`. */
function TumblingE({ size, dir }: { size: number; dir: Dir }) {
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" style={{ transform: `rotate(${ROTATE[dir]}deg)` }} shapeRendering="crispEdges" aria-label="E">
      <path d="M0 0h5v1H1v1h4v1H1v1h4v1H0z" fill="currentColor" />
    </svg>
  );
}

export default function VisionTest({ code, lang, clinic, operatedEye, onSafety }: {
  code: string; lang: Lang; clinic: Clinic; operatedEye?: "right" | "left" | null; onSafety: (m: Message[]) => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [kind, setKind] = useState<Kind>("distance");
  const [eye, setEye] = useState<"right" | "left">(operatedEye || "right");
  const [pxmm, setPxmm] = useState<number | null>(null);
  const [stair, setStair] = useState<Stair>(startStair());
  const [cells, setCells] = useState<number[]>([]);
  const [res, setRes] = useState<{ test: VisionResult; saved: string; messages: Message[] } | null>(null);
  const [history, setHistory] = useState<VisionResult[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPxmm(calibration.get()); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);
  const loadHistory = () => api<VisionResult[]>(`/p/${code}/vision-tests`).then(setHistory);
  useEffect(() => { loadHistory(); }, [code]);

  const begin = (k: Kind) => { setKind(k); setStep(pxmm ? "eye" : "calibrate"); };
  const submit = async (payload: object) => {
    const r = await api<{ test: VisionResult; saved: string; messages: Message[] }>(`/p/${code}/vision-tests`, { method: "POST", json: payload });
    setRes(r); setStep("result"); setSaving(false); loadHistory();
    if (r.messages.length) onSafety(r.messages);
  };
  const onAnswer = (a: Dir | "none") => {
    const next = answer(stair, a);
    setStair(next);
    if (next.phase === "done") {
      setSaving(true);
      submit({ eye, kind, distance_cm: DIST[kind], logmar: result(next), px_per_mm: pxmm, helper: kind === "distance", trials: next.trials });
    }
  };
  const other = tr(lang, eye === "right" ? "leftEye" : "rightEye");

  if (step === "calibrate") return <Calibrate lang={lang} onDone={(v) => { calibration.set(v); setPxmm(v); setStep("eye"); }} />;

  if (step === "eye") {
    return (
      <Card className="flex flex-col gap-5 p-6">
        <h3 className="text-[1.375rem] font-semibold">{tr(lang, kind === "distance" ? "distTitle" : kind === "near" ? "nearTitle" : "amslerTitle")}</h3>
        <div>
          <p className="mb-2 text-[0.9375rem] text-muted">{tr(lang, "whichEye")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["right", "left"] as const).map((e) => (
              <button key={e} type="button" onClick={() => setEye(e)} aria-pressed={eye === e}
                className={cx("min-h-16 rounded-2xl border px-3 text-[1.0625rem] font-medium", eye === e ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-2")}>
                {tr(lang, e === "right" ? "rightEye" : "leftEye")}
                {operatedEye === e && <span className="block text-[0.75rem] font-normal opacity-80">{tr(lang, "operatedTag")}</span>}
              </button>
            ))}
          </div>
        </div>
        <p className="rounded-2xl bg-sky-bg px-4 py-3 text-[1rem] text-sky">
          {tr(lang, "coverOther", { eye: other })}<br />
          {tr(lang, kind === "distance" ? "distDesc" : kind === "near" ? "nearDesc" : "amslerDesc")}
        </p>
        <Button size="lg" onClick={() => { setStair(startStair()); setCells([]); setStep("test"); }}>{tr(lang, "begin")}</Button>
        <Button variant="ghost" onClick={() => setStep("menu")}>{tr(lang, "again")}</Button>
      </Card>
    );
  }

  if (saving) return <div className="grid min-h-[50vh] place-items-center"><Spinner label={tr(lang, "yourResult")} /></div>;

  if (step === "test" && kind === "amsler") {
    const mm5 = (pxmm || 3.78) * 5;
    const size = Math.min(mm5 * 10, typeof window !== "undefined" ? window.innerWidth - 48 : 360);
    const cell = size / 10;
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-[1rem] text-muted">{tr(lang, "amslerDesc")}</p>
        <div className="relative bg-white" style={{ width: size, height: size }} role="grid" aria-label="Amsler grid">
          {Array.from({ length: 100 }).map((_, i) => (
            <button key={i} type="button" aria-pressed={cells.includes(i)} aria-label={`cell ${i}`}
              onClick={() => setCells(cells.includes(i) ? cells.filter((c) => c !== i) : [...cells, i])}
              className="absolute border border-black/80" style={{ left: (i % 10) * cell, top: Math.floor(i / 10) * cell, width: cell + 1, height: cell + 1, background: cells.includes(i) ? "rgba(251,113,133,.55)" : "transparent" }} />
          ))}
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button size="lg" variant="soft" onClick={() => { setSaving(true); submit({ eye, kind: "amsler", distance_cm: 30, amsler_cells: [], px_per_mm: pxmm }); }}>{tr(lang, "allStraight")}</Button>
          <Button size="lg" disabled={!cells.length} onClick={() => { setSaving(true); submit({ eye, kind: "amsler", distance_cm: 30, amsler_cells: cells, px_per_mm: pxmm }); }}>{tr(lang, "doneMarking")} ({cells.length})</Button>
        </div>
      </div>
    );
  }

  if (step === "test") {
    const px = optotypePx(stair.level, DIST[kind], pxmm || 3.78);
    const arrows: [Dir, React.ComponentType<{ size?: number }>][] = [["up", ArrowUp], ["left", ArrowLeft], ["right", ArrowRight], ["down", ArrowDown]];
    const btn = (d: Dir, I: React.ComponentType<{ size?: number }>) => (
      <button key={d} type="button" onClick={() => onAnswer(d)} aria-label={d} className="grid h-20 w-20 place-items-center rounded-3xl border border-line bg-surface-2 text-ink active:bg-accent active:text-on-accent">
        <I size={34} />
      </button>
    );
    return (
      <div className="flex flex-col items-center gap-6">
        {kind === "distance" && <p className="flex items-center gap-2 text-[0.875rem] text-muted"><Users size={16} /> {tr(lang, "helperTaps")}</p>}
        <div className="grid h-[44vh] w-full place-items-center rounded-3xl bg-white text-black" aria-live="polite">
          <TumblingE size={Math.max(2, px)} dir={stair.shown} />
        </div>
        <p className="text-center text-[1rem] text-muted">{tr(lang, "whichWay")}</p>
        <div className="grid grid-cols-3 gap-3">
          <span />{btn(arrows[0][0], arrows[0][1])}<span />
          {btn(arrows[1][0], arrows[1][1])}
          <button type="button" onClick={() => onAnswer("none")} className="grid h-20 w-20 place-items-center rounded-3xl border border-line text-[0.8125rem] text-muted">{tr(lang, "cantSee")}</button>
          {btn(arrows[2][0], arrows[2][1])}
          <span />{btn(arrows[3][0], arrows[3][1])}<span />
        </div>
        <p className="font-mono text-[0.6875rem] text-muted">{snellen(stair.level)} · {stair.trials.length + 1}</p>
      </div>
    );
  }

  if (step === "result" && res) {
    const t = res.test;
    return (
      <div className="flex flex-col gap-4">
        <Card className="p-6 text-center">
          <p className="eyebrow">{tr(lang, "yourResult")} · {tr(lang, t.eye === "right" ? "rightEye" : "leftEye")}</p>
          {t.kind === "amsler" ? (
            <p className={cx("mt-3 text-[1.625rem] font-semibold", t.amsler_abnormal ? "text-warn" : "text-ok")}>{tr(lang, t.amsler_abnormal ? "linesWavy" : "linesOk")}</p>
          ) : (
            <p className="mt-2 font-mono text-[3.5rem] font-medium leading-none">{t.snellen}</p>
          )}
          <div className="mt-4 flex flex-col gap-1 text-[0.9375rem] text-muted">
            {t.baseline_snellen && <p>{tr(lang, "beforeSurgery")}: <b className="font-mono text-ink">{t.baseline_snellen}</b>{t.vs_baseline_lines && t.vs_baseline_lines > 0 ? ` · ${tr(lang, "linesBetter", { n: t.vs_baseline_lines })}` : ""}</p>}
            {t.predicted_snellen && <p>{tr(lang, "expected")}: <b className="font-mono text-ink">{t.predicted_snellen}</b></p>}
          </div>
          <p className="mt-4 text-[0.875rem] text-ok">{res.saved}</p>
        </Card>
        {res.messages.length > 0 && <MessageList messages={res.messages} lang={lang} showEn={false} clinic={clinic} />}
        <Button size="lg" variant="soft" onClick={() => setStep("menu")}>{tr(lang, "again")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[1.5rem] font-semibold tracking-[-0.02em]">{tr(lang, "tabTest")}</h2>
        <p className="mt-1 text-[0.9375rem] text-muted">{tr(lang, "testIntro")}</p>
      </div>
      {([["distance", Users, "distTitle", "distDesc"], ["near", Eye, "nearTitle", "nearDesc"], ["amsler", Grid3x3, "amslerTitle", "amslerDesc"]] as const).map(([k, I, t, d]) => (
        <button key={k} type="button" onClick={() => begin(k)} className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-5 text-left transition hover:border-accent">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent"><I size={22} /></span>
          <span><span className="block text-[1.125rem] font-semibold">{tr(lang, t)}</span><span className="mt-1 block text-[0.875rem] leading-snug text-muted">{tr(lang, d)}</span></span>
        </button>
      ))}
      {pxmm && <button type="button" onClick={() => setStep("calibrate")} className="inline-flex items-center gap-2 self-start text-[0.8125rem] text-muted"><Ruler size={14} /> {tr(lang, "calibTitle")}</button>}
      <History lang={lang} items={history} />
      <p className="text-[0.7812rem] text-muted">{tr(lang, "testNote")}</p>
    </div>
  );
}

function Calibrate({ lang, onDone }: { lang: Lang; onDone: (pxPerMm: number) => void }) {
  const [w, setW] = useState(() => Math.round((calibration.get() || 3.78) * CARD_MM));
  return (
    <Card className="flex flex-col gap-5 p-6">
      <h3 className="text-[1.375rem] font-semibold">{tr(lang, "calibTitle")}</h3>
      <p className="text-[1rem] leading-relaxed text-muted">{tr(lang, "calibDesc")}</p>
      <div className="grid place-items-center py-2">
        <div className="rounded-xl border-2 border-dashed border-accent bg-accent/10" style={{ width: w, height: w * (53.98 / 85.6) }} />
      </div>
      <input type="range" min={180} max={560} value={w} onChange={(e) => setW(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label="Card width" />
      <Button size="lg" onClick={() => onDone(w / CARD_MM)}>{tr(lang, "calibDone")}</Button>
    </Card>
  );
}

function History({ lang, items }: { lang: Lang; items: VisionResult[] }) {
  const acuity = useMemo(() => items.filter((t) => t.kind !== "amsler").slice(-8).reverse(), [items]);
  const amsler = items.filter((t) => t.kind === "amsler").slice(-2).reverse();
  if (!items.length) return null;
  return (
    <Card>
      <h3 className="mb-3 text-[1.0625rem] font-semibold">{tr(lang, "history")}</h3>
      <ul className="flex flex-col gap-2">
        {acuity.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
            <span className="text-[0.875rem]">{tr(lang, t.eye === "right" ? "rightEye" : "leftEye")} · {tr(lang, t.kind === "distance" ? "distTitle" : "nearTitle")}</span>
            <span className="flex items-center gap-2">
              <Badge tone={t.day === null ? "neutral" : "sky"}>{t.day === null ? tr(lang, "beforeSurgery") : tr(lang, "dayN", { n: t.day })}</Badge>
              <b className="font-mono text-[1rem] font-medium">{t.snellen}</b>
            </span>
          </li>
        ))}
        {amsler.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2.5 text-[0.875rem]">
            <span>{tr(lang, t.eye === "right" ? "rightEye" : "leftEye")} · {tr(lang, "amslerTitle")}</span>
            <span className={t.amsler_abnormal ? "text-warn" : "text-ok"}>{tr(lang, t.amsler_abnormal ? "linesWavy" : "linesOk")}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

