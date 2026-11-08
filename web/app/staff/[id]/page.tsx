"use client";

// Surgeon view of one patient. Summary first, details on demand:
//   Overview      four numbers, the recommended plan with its approval, what needs attention, the patient's day
//   Lens plan     every plan as a compact row (click for the reasons), the Vision Day Map, the curves
//   Eyes          planning eye, dominance, fellow eye, biometry, ocular conditions, data
//   Recovery      surgery date, drops, home vision tests
//   Conversation  the transcript, before surgery and after

import {
  Activity as ActivityIco, AlertTriangle, ArrowLeft, BellRing, Check, ChevronDown, CircleGauge, ClipboardList, Droplet, ExternalLink, Eye, FileUp,
  HeartPulse, MessagesSquare, Pencil, Plus, RotateCcw, ScanEye, Sparkles, Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DefocusChart from "@/components/DefocusChart";
import { ActivityIcon, DayMatrix, distanceLabel } from "@/components/DayMap";
import { CardTitle, KV, PillTabs, Stat, type TabDef } from "@/components/kit";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AlertItem, STAGE, StaffShell } from "@/components/StaffShell";
import { Badge, Button, Spinner, cx } from "@/components/ui";
import { api, type Activity, type LensOption, type Meta, type Recommendation, type StaffPatientDetail, type VisionResult } from "@/lib/api";
import { LANG_NAMES } from "@/lib/i18n";

export default function StaffPatient() {
  return <StaffShell>{(meta) => <Detail meta={meta} />}</StaffShell>;
}

type Tab = "overview" | "plan" | "eyes" | "recovery" | "chat";
const EYE = { right: "OD", left: "OS" } as const;
const pct = (v: number) => `${(v * 100).toFixed(0)}`;
const signed = (v: number, d = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;
const cost = (n: number) => "₹".repeat(Math.max(1, n));
const eyeName = (ep: LensOption["eyes"]["right"]) => (ep.toric && !/toric/i.test(ep.name) ? `${ep.name} toric` : ep.name);

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cx("card-solid rounded-[24px] p-5", className)}>{children}</section>;
}

function Detail({ meta }: { meta: Meta }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<StaffPatientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const load = useCallback(() => api<StaffPatientDetail>(`/staff/patients/${id}`, { staff: true }).then(setD).catch((e) => setErr(String(e))), [id]);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const rec = d?.recommendation ?? null;
  // Default selection: the approved plan, else the best suitable one. Keep the surgeon's pick across refreshes.
  useEffect(() => {
    if (!rec) return;
    setSel((s) => (s && rec.options.some((o) => o.key === s && !o.excluded) && rec.status !== "approved" ? s : rec.approved_lens || rec.options.find((o) => !o.excluded)?.key || null));
    setNote((n) => n || rec.surgeon_note || "");
  }, [rec]);

  const patch = async (body: object) => setD(await api<StaffPatientDetail>(`/staff/patients/${id}`, { method: "PATCH", json: body, staff: true }));
  const post = async (path: string, body?: object) => setD(await api<StaffPatientDetail>(`/staff/patients/${id}${path}`, { method: "POST", json: body ?? {}, staff: true }));
  const ack = async (aid: number, n: string) => { await api(`/staff/alerts/${aid}/ack`, { method: "POST", json: { note: n }, staff: true }); load(); };

  if (err) return <p className="text-danger">{err}</p>;
  if (!d) return <Spinner label="Loading record" />;
  const p = d.patient;
  const open = d.alerts.filter((a) => a.status === "open");
  const urgent = open.filter((a) => a.severity === "urgent").length;
  const activities = rec?.activities || p.profile.activities || [];
  const chosen = rec?.options.find((o) => o.key === sel) || rec?.options[0] || null;
  const approve = () => sel && post("/approve", { lens_key: sel, note });

  const tabs: TabDef<Tab>[] = [
    { id: "overview", label: "Overview", icon: CircleGauge, count: open.length, alert: urgent > 0 },
    { id: "plan", label: "Lens plan", icon: ScanEye, count: rec?.options.length },
    { id: "eyes", label: "Eyes", icon: Eye },
    { id: "recovery", label: "Recovery", icon: HeartPulse },
    { id: "chat", label: "Conversation", icon: MessagesSquare, count: d.messages.length },
  ];
  const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------ header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/staff" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition hover:text-ink" aria-label="Back to patients"><ArrowLeft size={18} /></Link>
        <span className="stat-accent grid h-12 w-12 place-items-center rounded-2xl text-[1.0625rem] font-semibold text-white">{initials}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[1.625rem] font-semibold tracking-[-0.03em]">{p.name}</h1>
            <Badge tone={STAGE[p.stage].tone}>{STAGE[p.stage].label}</Badge>
          </div>
          <p className="text-[0.875rem] text-muted">
            {[p.age && `${p.age}${p.sex || ""}`, p.occupation, p.city, LANG_NAMES[p.language], `${p.eye} eye (${EYE[p.eye]})`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center rounded-full bg-surface-2 px-4 font-mono text-[0.8125rem] tracking-[.1em]">{p.id}</span>
          <a href={`/p/${p.id}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[0.875rem] transition hover:border-line-strong">Patient app <ExternalLink size={14} /></a>
        </div>
      </div>

      <PillTabs id="patient" tabs={tabs} value={tab} onChange={setTab} className="self-start" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
          {tab === "overview" && (
            <Overview d={d} rec={rec} chosen={chosen} activities={activities} open={open} onAck={ack} note={note} setNote={setNote}
              onApprove={approve} onReopen={() => post("/reopen")} onRank={() => post("/recommend")} goPlan={() => setTab("plan")} goChat={() => setTab("chat")} />
          )}
          {tab === "plan" && (
            rec ? <PlanTab rec={rec} sel={sel} setSel={setSel} note={note} setNote={setNote} onApprove={approve} onReopen={() => post("/reopen")}
              activities={activities} prefs={{ glasses_free: p.profile.glasses_free ?? 2, budget: p.profile.budget ?? 1 }}
              onSaveActivities={(acts, prefs) => patch({ activities: acts, ...prefs })} /> : <NoPlan onRank={() => post("/recommend")} />
          )}
          {tab === "eyes" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <EyesCard d={d} onPatch={patch} onSecondEye={(se) => post("/second-eye", { actual_se: se })} />
              <BiometryCard d={d} onImport={async (file) => {
                const fd = new FormData(); fd.append("file", file);
                setD(await api<StaffPatientDetail>(`/staff/patients/${id}/biometry/import`, { method: "POST", body: fd, staff: true }));
              }} onSave={(b) => post("/biometry", b)} />
              <Panel>
                <CardTitle>Ocular conditions</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(meta.conditions).map(([k, v]) => {
                    const on = p.conditions.includes(k);
                    return (
                      <button key={k} type="button" aria-pressed={on} onClick={() => patch({ conditions: on ? p.conditions.filter((c) => c !== k) : [...p.conditions, k] })}
                        className={cx("min-h-9 rounded-full border px-3 text-left text-[0.8125rem] transition", on ? "border-warn bg-warn-bg text-warn" : "border-line text-muted hover:text-ink")}>{v}</button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[0.75rem] text-muted">Changes re-rank the plans immediately.</p>
              </Panel>
              <Panel>
                <CardTitle>Data &amp; consent</CardTitle>
                <KV rows={[["Consent", p.consent_at ? new Date(p.consent_at).toLocaleString() : "Not yet given"], ["Phone", p.phone || "—"], ["Registered", new Date(p.created_at).toLocaleDateString()]]} />
                <Button variant="danger" size="sm" className="mt-4" onClick={async () => { if (confirm(`Delete all data for ${p.name}?`)) { await api(`/staff/patients/${id}`, { method: "DELETE", staff: true }); router.push("/staff"); } }}><Trash2 size={14} /> Delete patient (right to erasure)</Button>
              </Panel>
            </div>
          )}
          {tab === "recovery" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <SurgeryCard d={d} onDate={(date) => patch(date ? { surgery_date: date } : { clear_surgery_date: true })} />
              <VisionCard tests={d.vision_tests || []} operatedEye={p.stage === "post_op" ? p.eye : null} />
            </div>
          )}
          {tab === "chat" && <Transcript d={d} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ================================================================ Overview */

function Overview({ d, rec, chosen, activities, open, onAck, note, setNote, onApprove, onReopen, onRank, goPlan, goChat }: {
  d: StaffPatientDetail; rec: Recommendation | null; chosen: LensOption | null; activities: Activity[]; open: StaffPatientDetail["alerts"];
  onAck: (id: number, note: string) => void; note: string; setNote: (s: string) => void; onApprove: () => void; onReopen: () => void; onRank: () => void; goPlan: () => void; goChat: () => void;
}) {
  const p = d.patient, r = d.recovery;
  const primary = chosen?.eyes?.[p.eye];
  const urgent = open.filter((a) => a.severity === "urgent").length;
  const attention = [
    ...(rec?.biometry_notes || []).map((n) => ({ tone: "warn" as const, text: n.text })),
    ...(chosen?.flags || []).filter((f) => f.level !== "info").map((f) => ({ tone: f.level === "contraindicated" ? "danger" as const : "warn" as const, text: f.text })),
  ];
  const lastTest = (d.vision_tests || []).filter((t) => t.kind === "distance" && t.logmar != null).at(-1);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="accent" label="Clear without glasses" icon={Sparkles} value={chosen ? chosen.hours_clear : "—"} decimals={chosen && chosen.hours_clear % 1 ? 1 : 0}
          unit={chosen ? `of ${chosen.hours_total} h a day` : undefined} hint={chosen ? chosen.name : "No plan yet"} />
        <Stat spotlight label="Plan fit" icon={CircleGauge} value={chosen && !chosen.excluded ? Number(pct(chosen.score)) : "—"} unit={chosen ? "/ 100" : undefined}
          hint={rec ? `${rec.options.filter((o) => !o.excluded).length} suitable plans` : "Waiting for the conversation"} />
        {p.stage === "post_op" && r ? (
          <Stat spotlight label="Drops taken" icon={Droplet} value={r.adherence.pct ?? "—"} unit={r.adherence.pct != null ? "%" : undefined}
            tone={(r.adherence.pct ?? 100) < 85 ? "danger" : "plain"} hint={`Day ${r.day ?? "—"} · ${r.adherence.missed} missed`} />
        ) : (
          <Stat spotlight label={`IOL power ${EYE[p.eye]}`} icon={ScanEye} value={primary?.iol_power_d != null ? signed(primary.iol_power_d, 1) : "—"} unit={primary?.iol_power_d != null ? "D" : undefined}
            hint={primary?.iol_power_d != null ? `SRK/T · target ${signed(primary.power_target ?? primary.target)} D` : "Add biometry in Eyes"} />
        )}
        <Stat spotlight label="Open alerts" icon={BellRing} value={open.length} tone={urgent ? "danger" : open.length ? "plain" : "ok"}
          hint={urgent ? `${urgent} urgent` : lastTest ? `Last eye test ${lastTest.snellen}` : "Nothing waiting"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {rec && chosen ? (
          <RecommendationCard rec={rec} o={chosen} note={note} setNote={setNote} onApprove={onApprove} onReopen={onReopen} goPlan={goPlan} />
        ) : <NoPlan onRank={onRank} />}

        <div className="flex flex-col gap-5">
          {(open.length > 0 || attention.length > 0) && (
            <Panel>
              <CardTitle action={<Badge tone={urgent ? "danger" : "warn"}>{open.length + attention.length}</Badge>}>Needs your attention</CardTitle>
              {open.length > 0 && <ul className="mb-3 flex flex-col gap-2.5">{open.map((a) => <AlertItem key={a.id} a={a} onAck={onAck} showPatient={false} />)}</ul>}
              {attention.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {attention.slice(0, 4).map((a) => (
                    <li key={a.text} className={cx("flex gap-2.5 rounded-xl px-3 py-2.5 text-[0.8125rem] leading-snug", a.tone === "danger" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn")}>
                      <AlertTriangle size={15} className="mt-px shrink-0" /> {a.text}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          <Panel>
            <CardTitle action={<button type="button" onClick={goChat} className="text-[0.8125rem] text-muted transition hover:text-ink">Conversation →</button>}>Their day</CardTitle>
            {activities.length === 0 ? <p className="text-[0.875rem] text-muted">Still talking to the assistant.</p> : (
              <ul className="flex flex-col gap-1">
                {activities.map((a) => {
                  const row = chosen?.day_map.find((r) => r.activity === a.id);
                  return (
                    <li key={a.id + a.label} className="flex items-center gap-3 rounded-xl px-1 py-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><ActivityIcon id={a.id} size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.875rem] font-medium">{a.label}</p>
                        <p className="text-[0.75rem] text-muted">{a.hours} h · {distanceLabel(a.distance_cm)}{a.night ? " · night" : ""}</p>
                      </div>
                      {row && <span className={cx("rounded-full px-2.5 py-1 font-mono text-[0.75rem]", row.status === "clear" ? "bg-ok-bg text-ok" : row.status === "strain" ? "bg-warn-bg text-warn" : "bg-danger-bg text-danger")}>{row.snellen}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function NoPlan({ onRank }: { onRank: () => void }) {
  return (
    <Panel className="flex flex-col items-start gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted"><MessagesSquare size={20} /></span>
      <h2 className="text-[1.25rem] font-semibold">No plan yet</h2>
      <p className="max-w-[46ch] text-[0.9375rem] text-muted">The patient is still talking to the assistant. Plans appear when the conversation ends, or rank now with what is known.</p>
      <Button variant="soft" onClick={onRank}>Rank now</Button>
    </Panel>
  );
}

/** The selected plan, its key numbers, the top reasons, and the approval. */
function RecommendationCard({ rec, o, note, setNote, onApprove, onReopen, goPlan }: {
  rec: Recommendation; o: LensOption; note: string; setNote: (s: string) => void; onApprove: () => void; onReopen: () => void; goPlan: () => void;
}) {
  const approved = rec.status === "approved";
  const reasons = [...o.contributions.filter((c) => Math.abs(c.value) >= 0.01).map((c) => ({ label: c.label, value: c.value })), ...o.adjustments.map((a) => ({ label: a.reason.split(":")[0], value: a.value }))]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 4);
  const rank = rec.options.findIndex((x) => x.key === o.key) + 1;
  return (
    <section className="card-solid relative flex flex-col gap-5 overflow-hidden rounded-[24px] p-6">
      {!approved && <BorderBeam size={120} duration={9} colorFrom="#7aa2ff" colorTo="#3346ff" borderWidth={1.5} />}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.8125rem] font-medium text-muted">{approved ? "Approved plan" : "Recommended plan"}</span>
        {approved ? <Badge tone="ok"><Check size={12} /> Approved</Badge> : <Badge tone="warn">Awaiting your approval</Badge>}
        {rank > 1 && !approved && <Badge>Rank {rank} of {rec.options.length}</Badge>}
        <button type="button" onClick={goPlan} className="ml-auto text-[0.8125rem] text-muted transition hover:text-ink">Compare all {rec.options.length} plans →</button>
      </div>

      <div>
        <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{o.name}</h2>
        <p className="mt-1.5 text-[0.9375rem] text-muted">Glasses {o.glasses_after.toLowerCase()} · cost {cost(o.cost_tier)}{o.strategy === "blended" ? ` · eyes ${o.anisometropia_d.toFixed(2)} D apart` : ""}</p>
      </div>

      {rec.refinement && <p className="rounded-xl border border-sky/40 bg-sky-bg px-4 py-3 text-[0.8125rem] text-sky"><b>Second-eye refinement.</b> {rec.refinement.text}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["right", "left"] as const).map((e) => {
          const ep = o.eyes?.[e];
          if (!ep) return null;
          return (
            <div key={e} className="rounded-2xl bg-surface-2 px-4 py-3">
              <p className="flex items-center justify-between text-[0.75rem] text-muted"><span className="font-mono">{EYE[e]}{rec.dominant_eye === e ? " · dominant" : ""}</span><span>{ep.fixed ? "implanted" : `target ${signed(ep.target)} D`}</span></p>
              <p className="mt-1 flex items-baseline justify-between gap-2"><span className="text-[1rem] font-medium">{eyeName(ep)}</span>
                <span className="font-mono text-[1.0625rem]">{ep.iol_power_d != null ? `${signed(ep.iol_power_d, 1)} D` : ep.fixed ? null : <span className="text-[0.8125rem] text-muted">needs biometry</span>}</span></p>
            </div>
          );
        })}
      </div>

      {reasons.length > 0 && (
        <div>
          <p className="mb-2 text-[0.75rem] text-muted">Why, compared with an average lens</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <span key={r.label} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem]", r.value >= 0 ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger")}>
                <b className="font-mono font-medium">{r.value >= 0 ? "+" : "−"}{pct(Math.abs(r.value))}</b> {r.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <ApproveBar rec={rec} o={o} note={note} setNote={setNote} onApprove={onApprove} onReopen={onReopen} />
    </section>
  );
}

function ApproveBar({ rec, o, note, setNote, onApprove, onReopen }: { rec: Recommendation; o: LensOption | null; note: string; setNote: (s: string) => void; onApprove: () => void; onReopen: () => void }) {
  const [noteOpen, setNoteOpen] = useState(!!note);
  if (rec.status === "approved") {
    const ap = rec.options.find((x) => x.key === rec.approved_lens);
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <p className="text-[0.875rem]"><Check size={15} className="mr-1 inline text-ok" />Approved <b>{ap?.name}</b>{rec.surgeon_note ? ` · “${rec.surgeon_note}”` : ""}. The patient now sees it in their app.</p>
        <Button variant="soft" size="sm" className="ml-auto" onClick={onReopen}><RotateCcw size={14} /> Revise</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {noteOpen ? (
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} autoFocus aria-label="Note to the patient"
          placeholder="Note to the patient, in plain words. e.g. We discussed halos at night; you'll need light reading glasses for fine print."
          className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[0.9375rem] focus:border-accent focus:outline-none" />
      ) : (
        <button type="button" onClick={() => setNoteOpen(true)} className="flex items-center gap-2 self-start text-[0.875rem] text-muted transition hover:text-ink"><Pencil size={14} /> Add a note for the patient</button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!o || o.excluded} onClick={onApprove} arrow className="flex-1 sm:flex-none">Approve {o?.name}</Button>
        <p className="min-w-[200px] flex-1 text-[0.6875rem] leading-relaxed text-muted">{rec.disclaimer}</p>
      </div>
    </div>
  );
}

/* ================================================================ Lens plan */

function PlanTab({ rec, sel, setSel, note, setNote, onApprove, onReopen, activities, prefs, onSaveActivities }: {
  rec: Recommendation; sel: string | null; setSel: (k: string) => void; note: string; setNote: (s: string) => void; onApprove: () => void; onReopen: () => void;
  activities: Activity[]; prefs: { glasses_free: number; budget: number }; onSaveActivities: (a: Activity[], p: { glasses_free: number; budget: number }) => Promise<void>;
}) {
  const [view, setView] = useState<"plans" | "day" | "curves">("plans");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const approved = rec.status === "approved";
  const chosen = rec.options.find((o) => o.key === sel) || null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <PillTabs id="planview" size="sm" value={view} onChange={setView} tabs={[{ id: "plans", label: "Plans" }, { id: "day", label: "Vision Day Map" }, { id: "curves", label: "Defocus curves" }]} />
        <span className="ml-auto text-[0.75rem] text-muted">Wants to avoid glasses {rec.preferences.glasses_free}/3 · cost sensitivity {rec.preferences.budget}/3</span>
      </div>

      {view === "plans" && (
        <Panel className="p-2 sm:p-3">
          <AstigLine rec={rec} />
          <ol className="flex flex-col">
            {rec.options.map((o, i) => (
              <PlanRow key={o.key} o={o} rank={i + 1} selected={sel === o.key} approved={rec.approved_lens === o.key} locked={approved}
                open={openKey === o.key} onToggle={() => { setOpenKey(openKey === o.key ? null : o.key); if (!approved && !o.excluded) setSel(o.key); }} />
            ))}
          </ol>
          <div className="px-3 pb-2"><ApproveBar rec={rec} o={chosen} note={note} setNote={setNote} onApprove={onApprove} onReopen={onReopen} /></div>
        </Panel>
      )}

      {view === "day" && (
        <Panel>
          <CardTitle>Vision Day Map</CardTitle>
          <p className="-mt-2 mb-4 text-[0.8125rem] text-muted">Predicted acuity for each activity, from each plan&apos;s curve at that working distance.</p>
          <DayMatrix activities={activities} options={rec.options} />
          <ActivityEditor activities={activities} prefs={prefs} onSave={onSaveActivities} />
        </Panel>
      )}

      {view === "curves" && (
        <Panel>
          <CardTitle>Both-eyes defocus curves</CardTitle>
          <p className="-mt-2 mb-4 text-[0.8125rem] text-muted">Dashed lines mark the patient&apos;s activities; ticks show the acuity each one needs.</p>
          <DefocusChart
            curves={rec.options.filter((o) => !o.excluded).map((o) => ({ key: o.key, name: o.name, curve: o.binocular_curve, family: o.family }))}
            activities={activities} highlight={rec.approved_lens || sel || rec.options[0]?.key} />
        </Panel>
      )}
    </div>
  );
}

function AstigLine({ rec }: { rec: Recommendation }) {
  const parts = (["right", "left"] as const).flatMap((e) => {
    const a = rec.astigmatism_by_eye?.[e];
    if (!a || a.cyl == null) return [];
    return [`${EYE[e]} ${a.cyl} D${a.axis != null ? ` @${a.axis}°` : ""} · ${a.toric ? `toric (≈${a.iol_cyl_estimate} D at IOL)` : a.borderline ? "borderline toric" : "no toric"}`];
  });
  if (!parts.length) return null;
  return <p className="mx-3 mb-2 mt-1 font-mono text-[0.75rem] text-muted">Corneal astigmatism: {parts.join("   ·   ")}</p>;
}

function PlanRow({ o, rank, selected, approved, locked, open, onToggle }: { o: LensOption; rank: number; selected: boolean; approved: boolean; locked: boolean; open: boolean; onToggle: () => void }) {
  const share = o.hours_total ? o.hours_clear / o.hours_total : 0;
  return (
    <li className={cx("rounded-2xl transition", open && "bg-surface-2")}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-pressed={selected && !locked}
        className={cx("grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition sm:grid-cols-[28px_minmax(0,1.6fr)_minmax(0,1fr)_64px_56px_20px]",
          !open && "hover:bg-surface-2", o.excluded && "opacity-55")}>
        <span className={cx("grid h-7 w-7 place-items-center rounded-full text-[0.75rem] font-semibold", selected && !o.excluded ? "bg-accent text-white" : "bg-surface-2 text-muted")}>{selected && !o.excluded ? <Check size={14} /> : rank}</span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[0.9375rem] font-medium">{o.name}</span>
            {approved && <Badge tone="ok">Approved</Badge>}
            {o.excluded && <Badge tone="danger">Not suitable</Badge>}
            {o.strategy === "blended" && !o.excluded && <Badge tone="sky">Blended</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-muted">Glasses {o.glasses_after.toLowerCase()}</span>
        </span>
        <span className="hidden items-center gap-2 sm:flex" title="Hours a day clear without glasses">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} /></span>
          <span className="w-12 text-right font-mono text-[0.75rem] text-muted">{o.hours_clear}/{o.hours_total} h</span>
        </span>
        <span className="hidden font-mono text-[0.8125rem] text-muted sm:block">{cost(o.cost_tier)}</span>
        <span className="text-right font-mono text-[1.0625rem]">{o.excluded ? "—" : pct(o.score)}</span>
        <ChevronDown size={16} className={cx("hidden text-muted transition sm:block", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="overflow-hidden">
            <PlanDetail o={o} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function PlanDetail({ o }: { o: LensOption }) {
  const max = Math.max(0.05, ...o.contributions.map((c) => Math.abs(c.value)), ...o.adjustments.map((a) => Math.abs(a.value)));
  const bars = [...o.contributions.filter((c) => Math.abs(c.value) >= 0.003).slice(0, 6).map((c) => ({ label: c.label, value: c.value })), ...o.adjustments.map((a) => ({ label: a.reason.split(":")[0], value: a.value }))];
  return (
    <div className="grid gap-5 px-4 pb-5 pt-1 md:grid-cols-2">
      <div>
        <p className="mb-2 text-[0.75rem] text-muted">Per eye</p>
        <KV rows={(["right", "left"] as const).filter((e) => o.eyes?.[e]).map((e) => {
          const ep = o.eyes[e];
          return [`${EYE[e]} · ${eyeName(ep)}`, <span key={e} className="font-mono">{ep.fixed ? "implanted" : `target ${signed(ep.target)} D · `}{ep.iol_power_d != null ? `${signed(ep.iol_power_d, 1)} D SRK/T${ep.refined ? " · refined" : ""}` : ep.fixed ? "" : "—"}</span>];
        })} />
        {o.flags.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 text-[0.8125rem]">
            {o.flags.map((f) => <li key={f.text} className={f.level === "contraindicated" ? "text-danger" : f.level === "caution" ? "text-warn" : "text-sky"}>• {f.text}</li>)}
          </ul>
        )}
        {o.example_models && <p className="mt-3 font-mono text-[0.6875rem] text-muted">{o.example_models}</p>}
      </div>
      <div>
        {!o.excluded && (
          <>
            <p className="mb-2 text-[0.75rem] text-muted">Why (vs. average lens = {pct(o.baseline)})</p>
            <div className="grid gap-1.5">
              {bars.map((b) => (
                <div key={b.label} className="grid grid-cols-[minmax(0,150px)_1fr_40px] items-center gap-2 text-[0.75rem]">
                  <span className="truncate text-muted" title={b.label}>{b.label}</span>
                  <div className="relative h-2">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                    <div className={cx("absolute inset-y-0 rounded-sm", b.value >= 0 ? "left-1/2 bg-ok" : "right-1/2 bg-danger")} style={{ width: `${(Math.abs(b.value) / max) * 50}%` }} />
                  </div>
                  <span className={cx("text-right font-mono", b.value >= 0 ? "text-ok" : "text-danger")}>{b.value >= 0 ? "+" : "−"}{pct(Math.abs(b.value))}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {o.curve_sources && o.curve_sources.length > 0 && (
          <details className="mt-4 text-[0.75rem] text-muted">
            <summary className="cursor-pointer select-none font-medium hover:text-ink">Curve sources ({o.curve_sources.length})</summary>
            <ul className="mt-1.5 flex flex-col gap-1 pl-3">{o.curve_sources.map((s) => <li key={s} className="list-disc">{s}</li>)}</ul>
          </details>
        )}
      </div>
    </div>
  );
}

const PRESETS: { label: string; cm: number }[] = [{ label: "Fine near (33 cm)", cm: 33 }, { label: "Reading (40 cm)", cm: 40 }, { label: "Arm's length (66 cm)", cm: 66 }, { label: "Room (3 m)", cm: 300 }, { label: "Far (6 m+)", cm: 600 }];

function ActivityEditor({ activities, prefs, onSave }: { activities: Activity[]; prefs: { glasses_free: number; budget: number }; onSave: (a: Activity[], p: { glasses_free: number; budget: number }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Activity[]>(activities);
  const [pr, setPr] = useState(prefs);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setRows(activities); setPr(prefs); } }, [activities, prefs, open]);
  const upd = (i: number, k: keyof Activity, v: unknown) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const cell = "min-h-9 rounded-lg border border-line bg-surface-2 px-2 text-[0.8125rem]";
  if (!open) return <Button variant="soft" size="sm" className="mt-4" onClick={() => setOpen(true)}><Pencil size={14} /> Correct activities &amp; preferences</Button>;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line p-4">
      {rows.map((a, i) => (
        <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1.6fr_1.3fr_.7fr_.8fr_.8fr_auto]">
          <input className={cx(cell, "col-span-2 sm:col-span-1")} value={a.label} onChange={(e) => upd(i, "label", e.target.value)} aria-label="Activity" />
          <select className={cell} value={a.distance_cm} onChange={(e) => upd(i, "distance_cm", Number(e.target.value))} aria-label="Distance">
            {[...PRESETS, ...(PRESETS.some((p) => p.cm === a.distance_cm) ? [] : [{ label: `${a.distance_cm} cm`, cm: a.distance_cm }])].map((p) => <option key={p.cm} value={p.cm}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-[0.75rem] text-muted"><input className={cx(cell, "w-14")} type="number" min={0.25} max={16} step={0.5} value={a.hours} onChange={(e) => upd(i, "hours", Number(e.target.value))} /> h</label>
          <select className={cell} value={a.detail} onChange={(e) => upd(i, "detail", e.target.value)} aria-label="Detail"><option value="fine">fine</option><option value="normal">normal</option><option value="coarse">coarse</option></select>
          <select className={cell} value={a.importance} onChange={(e) => upd(i, "importance", Number(e.target.value))} aria-label="Importance"><option value={1}>★ low</option><option value={2}>★★ med</option><option value={3}>★★★ high</option></select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[0.75rem] text-muted"><input type="checkbox" checked={a.night} onChange={(e) => upd(i, "night", e.target.checked)} /> night</label>
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove" className="text-muted hover:text-danger"><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setRows([...rows, { id: `custom_${rows.length}`, label: "New activity", distance_cm: 40, detail: "normal", night: false, hours: 1, importance: 2 }])}><Plus size={14} /> Add activity</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[0.8125rem] text-muted">Wants to avoid glasses: <b className="text-ink">{pr.glasses_free}</b>/3<input type="range" min={0} max={3} step={0.5} value={pr.glasses_free} onChange={(e) => setPr({ ...pr, glasses_free: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></label>
        <label className="text-[0.8125rem] text-muted">Cost sensitivity: <b className="text-ink">{pr.budget}</b>/3<input type="range" min={0} max={3} step={0.5} value={pr.budget} onChange={(e) => setPr({ ...pr, budget: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(rows, pr); setOpen(false); } finally { setBusy(false); } }}>Save &amp; re-rank</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ================================================================ Eyes */

function BiometryCard({ d, onImport, onSave }: { d: StaffPatientDetail; onImport: (f: File) => Promise<void>; onSave: (b: object) => Promise<void> }) {
  const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [eye, setEye] = useState<"right" | "left">(d.patient.eye);
  const cur = d.biometry_by_eye?.[eye];
  const [f, setF] = useState({ axial_length: "", k1: "", k2: "", k2_axis: "", acd: "", wtw: "" });
  useEffect(() => {
    setF({ axial_length: String(cur?.axial_length ?? ""), k1: String(cur?.k1 ?? ""), k2: String(cur?.k2 ?? ""), k2_axis: String(cur?.k2_axis ?? ""), acd: String(cur?.acd ?? ""), wtw: String(cur?.wtw ?? "") });
  }, [cur, eye]);
  const [err, setErr] = useState<string | null>(null);
  const B = d.biometry_by_eye || { right: null, left: null };
  const fmt = (v: number | null | undefined, n = 2) => (v == null ? "—" : v.toFixed(n));
  const rows: [string, (b: NonNullable<typeof B.right>) => string][] = [
    ["Axial length (mm)", (b) => fmt(b.axial_length)], ["K1 (D)", (b) => fmt(b.k1)], ["K2 (D)", (b) => fmt(b.k2)],
    ["Corneal cyl (D)", (b) => `${Math.abs(b.k2 - b.k1).toFixed(2)}${b.k2_axis != null ? ` @${b.k2_axis}°` : ""}`], ["ACD (mm)", (b) => fmt(b.acd)], ["WTW (mm)", (b) => fmt(b.wtw, 1)],
  ];
  const inp = "min-h-9 w-full rounded-lg border border-line bg-surface-2 px-2 font-mono text-[0.8125rem]";
  return (
    <Panel>
      <CardTitle action={<span className="font-mono text-[0.6875rem] text-muted">{d.biometry?.source || ""}</span>}>Biometry</CardTitle>
      <table className="w-full text-[0.875rem]">
        <thead><tr><th />{(["right", "left"] as const).map((e) => <th key={e} className={cx("pb-2 text-right font-mono text-[0.75rem] font-medium", d.patient.eye === e ? "text-accent-text" : "text-muted")}>{EYE[e]}{d.patient.eye === e ? " · planning" : ""}</th>)}</tr></thead>
        <tbody>{rows.map(([k, fn]) => (
          <tr key={k} className="border-t border-line"><td className="py-2 text-muted">{k}</td><td className="py-2 text-right font-mono">{B.right ? fn(B.right) : "—"}</td><td className="py-2 text-right font-mono">{B.left ? fn(B.left) : "—"}</td></tr>
        ))}</tbody>
      </table>
      {edit && (
        <form className="mt-3 grid grid-cols-3 gap-2" onSubmit={async (e) => { e.preventDefault(); try { await onSave({ eye, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])) }); setEdit(false); setErr(null); } catch (x) { setErr(String(x)); } }}>
          <div className="col-span-3 flex gap-2">{(["right", "left"] as const).map((e) => <button key={e} type="button" onClick={() => setEye(e)} className={cx("min-h-8 rounded-full border px-3 text-[0.75rem]", eye === e ? "border-accent text-accent-text" : "border-line text-muted")}>{e === "right" ? "OD (right)" : "OS (left)"}</button>)}</div>
          {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
            <label key={k} className="text-[0.6875rem] text-muted">{k.replace("_", " ")}<input className={inp} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
          ))}
          <Button type="submit" size="sm" className="col-span-3">Save {EYE[eye]}</Button>
        </form>
      )}
      {err && <p className="mt-2 text-[0.8125rem] text-danger">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={file} type="file" accept=".csv,.json,.txt" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) { try { await onImport(fl); setErr(null); } catch (x) { setErr(String(x)); } } e.target.value = ""; }} />
        <Button size="sm" variant="soft" onClick={() => file.current?.click()}><FileUp size={14} /> Import biometer export</Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit(!edit)}><Pencil size={14} /> Enter manually</Button>
      </div>
    </Panel>
  );
}

function EyesCard({ d, onPatch, onSecondEye }: { d: StaffPatientDetail; onPatch: (b: object) => Promise<void>; onSecondEye: (se: number) => Promise<void> }) {
  const p = d.patient;
  const [se, setSe] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const canSecond = (p.stage === "approved" || p.stage === "post_op") && (p.fellow_status || "planned") === "planned";
  const sel = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[0.875rem]";
  return (
    <Panel>
      <CardTitle>Both eyes</CardTitle>
      <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
        <label className="flex flex-col gap-1.5 text-muted">Planning now
          <select className={sel} value={p.eye} onChange={(e) => onPatch({ eye: e.target.value })}><option value="right">Right (OD)</option><option value="left">Left (OS)</option></select>
        </label>
        <label className="flex flex-col gap-1.5 text-muted">Dominant eye
          <select className={sel} value={p.dominant_eye || "unknown"} onChange={(e) => onPatch({ dominant_eye: e.target.value })}><option value="unknown">Not tested</option><option value="right">Right</option><option value="left">Left</option></select>
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-muted">Other eye
          <select className={sel} value={p.fellow_status || "planned"} onChange={(e) => onPatch({ fellow_status: e.target.value })}>
            <option value="planned">Also needs surgery (plan both)</option><option value="operated">Already has an IOL</option><option value="natural">Not for surgery</option>
          </select>
        </label>
      </div>
      {!p.dominant_eye && (
        <details className="mt-3 text-[0.75rem] text-muted">
          <summary className="cursor-pointer select-none hover:text-ink">How to test dominance</summary>
          <p className="mt-1.5">The patient makes a small triangle with both hands, frames a distant object, then closes each eye. The eye that keeps the object in the frame is dominant.</p>
        </details>
      )}
      {p.fellow_status === "operated" && p.fellow?.lens && (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">{p.fellow.eye === "right" ? "OD" : "OS"}: {p.fellow.lens} · ended {Number(p.fellow.actual_se).toFixed(2)} D (predicted {Number(p.fellow.predicted_se).toFixed(2)} D){p.fellow.date ? ` · ${p.fellow.date}` : ""}</p>
      )}
      {canSecond && (
        <form className="mt-4 flex flex-col gap-2 border-t border-line pt-4" onSubmit={async (e) => { e.preventDefault(); try { await onSecondEye(Number(se)); setErr(null); } catch (x) { setErr(String(x)); } }}>
          <p className="text-[0.8125rem] text-muted">First eye done? Enter its post-op spherical equivalent to plan the other eye around the real result.</p>
          <div className="flex gap-2">
            <input value={se} onChange={(e) => setSe(e.target.value)} inputMode="decimal" placeholder="e.g. -0.50" aria-label="Spherical equivalent in dioptres" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 font-mono text-[0.875rem]" />
            <Button size="sm" type="submit" disabled={se.trim() === "" || isNaN(Number(se))}>Plan second eye</Button>
          </div>
          {err && <p className="text-[0.75rem] text-danger">{err}</p>}
        </form>
      )}
    </Panel>
  );
}

/* ================================================================ Recovery */

function SurgeryCard({ d, onDate }: { d: StaffPatientDetail; onDate: (date: string | null) => void }) {
  const [date, setDate] = useState(d.patient.surgery_date || "");
  const r = d.recovery;
  const canSchedule = d.patient.stage === "approved" || d.patient.stage === "post_op";
  return (
    <Panel>
      <CardTitle>Surgery &amp; drops</CardTitle>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-10 flex-1 rounded-xl border border-line bg-surface-2 px-3 font-mono text-[0.875rem]" aria-label="Surgery date" />
        <Button size="sm" disabled={!date || !canSchedule} onClick={() => onDate(date)}>Set date</Button>
      </div>
      {!canSchedule && <p className="mt-2 text-[0.75rem] text-muted">Approve a plan first; the date then builds the drop schedule from the clinic protocol.</p>}
      {r && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Post-op day" value={r.day ?? "—"} className="!min-h-0 !p-3" />
            <Stat label="Drops taken" value={r.adherence.pct ?? "—"} unit={r.adherence.pct != null ? "%" : undefined} tone={(r.adherence.pct ?? 100) < 85 ? "danger" : "plain"} className="!p-3" />
            <Stat label="Missed" value={r.adherence.missed} tone={r.adherence.missed > 0 ? "danger" : "ok"} className="!p-3" />
          </div>
          {r.today.length > 0 && (
            <details className="text-[0.8125rem]">
              <summary className="cursor-pointer select-none text-muted hover:text-ink">Today&apos;s doses ({r.today.filter((x) => x.status === "taken").length}/{r.today.length} taken)</summary>
              <ul className="mt-2 divide-y divide-line">
                {r.today.map((x) => <li key={x.id} className="flex justify-between py-1.5 font-mono text-[0.75rem]"><span>{x.due_at.slice(11, 16)} {x.drug}</span><span className={x.status === "taken" ? "text-ok" : x.status === "missed" ? "text-danger" : "text-muted"}>{x.status}</span></li>)}
              </ul>
            </details>
          )}
          <KV rows={r.follow_ups.map((f) => [f.label, <span key={f.date} className={cx("font-mono", f.past && "text-muted")}>{f.date}</span>])} />
        </div>
      )}
    </Panel>
  );
}

function VisionCard({ tests, operatedEye }: { tests: VisionResult[]; operatedEye: "right" | "left" | null }) {
  const acu = tests.filter((t) => t.kind === "distance" && t.logmar != null);
  const amsler = tests.filter((t) => t.kind === "amsler");
  const W = 320, H = 150, m = { l: 40, r: 10, t: 12, b: 24 };
  const x = (i: number, n: number) => m.l + (n <= 1 ? (W - m.l - m.r) / 2 : (i / (n - 1)) * (W - m.l - m.r));
  const y = (lm: number) => m.t + ((Math.min(1.1, Math.max(-0.2, lm)) + 0.2) / 1.3) * (H - m.t - m.b);
  const COL = { right: "var(--accent)", left: "var(--sky)" } as const;
  const sn = (lm: number) => (lm >= 1 ? "6/60" : lm >= 0.6 ? "6/24" : lm >= 0.3 ? "6/12" : "6/6");
  const pred = acu.find((t) => t.predicted_logmar != null);
  const last = acu.at(-1);
  return (
    <Panel>
      <CardTitle action={<span className="text-[0.75rem] text-muted">Tumbling E at 2 m · card-calibrated</span>}>Home vision tests</CardTitle>
      {acu.length === 0 ? <p className="text-[0.875rem] text-muted">No results yet. The patient can test from the Eye test tab.</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distance acuity over time">
          {[0, 0.3, 0.6, 1.0].map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={m.l - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-mono)">{sn(v)}</text></g>)}
          {pred && <line x1={m.l} x2={W - m.r} y1={y(pred.predicted_logmar!)} y2={y(pred.predicted_logmar!)} stroke="var(--ok)" strokeDasharray="4 4" />}
          {(["right", "left"] as const).map((e) => {
            const pts = acu.map((t, i) => ({ t, i })).filter((q) => q.t.eye === e);
            if (!pts.length) return null;
            return (
              <g key={e}>
                <polyline points={pts.map((q) => `${x(q.i, acu.length)},${y(q.t.logmar!)}`).join(" ")} fill="none" stroke={COL[e]} strokeWidth={2} />
                {pts.map((q) => <circle key={q.t.id} cx={x(q.i, acu.length)} cy={y(q.t.logmar!)} r={q.t.day === null ? 3 : 4} fill={q.t.day === null ? "var(--surface-solid)" : COL[e]} stroke={COL[e]} strokeWidth={1.5}><title>{`${e} · ${q.t.day === null ? "pre-op" : "day " + q.t.day} · ${q.t.snellen}`}</title></circle>)}
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-muted">
        <span style={{ color: "var(--accent)" }}>● OD{operatedEye === "right" ? " (operated)" : ""}</span>
        <span style={{ color: "var(--sky)" }}>● OS{operatedEye === "left" ? " (operated)" : ""}</span>
        <span>○ pre-op</span>
        {pred && <span className="text-ok">--- expected {pred.predicted_snellen}</span>}
      </div>
      {last && (
        <p className="mt-3 text-[0.8125rem]">Latest {EYE[last.eye as "right" | "left"] ?? last.eye}: <b className="font-mono">{last.snellen}</b>{last.day != null ? ` on day ${last.day}` : " (pre-op)"}
          {last.vs_baseline_lines != null && ` · ${last.vs_baseline_lines > 0 ? "+" : ""}${last.vs_baseline_lines} lines vs pre-op`}
          {last.vs_predicted_lines != null && ` · ${last.vs_predicted_lines >= 0 ? "on or above" : `${Math.abs(last.vs_predicted_lines)} lines below`} expected`}
          {last.day != null && last.day < 7 && last.vs_predicted_lines != null && last.vs_predicted_lines < 0 && <span className="text-muted"> (early: vision usually keeps improving)</span>}</p>
      )}
      {amsler.map((a) => (
        <p key={a.id} className={cx("mt-2 rounded-xl px-3 py-2 text-[0.8125rem]", a.amsler_abnormal ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok")}>
          Amsler {a.eye === "right" ? "OD" : "OS"} {a.day == null ? "pre-op" : `day ${a.day}`}: {a.amsler_abnormal ? `distortion in ${a.amsler_cells.length} areas${a.day == null ? " · check the macula (OCT) before a multifocal lens" : ""}` : "normal"}
        </p>
      ))}
    </Panel>
  );
}

/* ================================================================ Conversation */

function Transcript({ d }: { d: StaffPatientDetail }) {
  const [ch, setCh] = useState<"intake" | "recovery">("intake");
  const msgs = d.messages.filter((m) => m.channel === ch);
  return (
    <Panel className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-[1.0625rem] font-semibold">Conversation</h2>
        <PillTabs id="chat" size="sm" className="ml-auto" value={ch} onChange={setCh} tabs={[
          { id: "intake", label: "Before surgery", count: d.messages.filter((m) => m.channel === "intake").length },
          { id: "recovery", label: "Questions & recovery", count: d.messages.filter((m) => m.channel === "recovery").length },
        ]} />
      </div>
      {msgs.length === 0 ? <p className="text-[0.875rem] text-muted">No messages yet.</p> : (
        <ol className="flex flex-col gap-3">
          {msgs.map((m) => (
            <li key={m.id} className={cx("flex", m.role === "patient" ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[78%] rounded-2xl px-4 py-3 text-[0.875rem]", m.meta.kind === "safety" ? "bg-danger-bg" : m.role === "patient" ? "bg-accent/15" : "bg-surface-2")}>
                <p lang={m.lang}>{m.text}</p>
                {m.text_en && m.text_en !== m.text && <p className="mt-1 text-[0.8125rem] text-muted">{m.text_en}</p>}
                {!!m.meta.extracted?.length && <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.6875rem] text-sky"><ActivityIco size={12} /> understood: {m.meta.extracted.join(", ")}</p>}
                {!!m.meta.citations?.length && <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.6875rem] text-sky"><ClipboardList size={12} /> cites {m.meta.citations.map((c) => c.id).join(", ")}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
