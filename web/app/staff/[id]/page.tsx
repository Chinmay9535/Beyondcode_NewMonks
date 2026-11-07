"use client";

import { ArrowLeft, Check, ExternalLink, FileUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import DefocusChart from "@/components/DefocusChart";
import { DayMatrix } from "@/components/DayMap";
import { AlertItem, STAGE, StaffShell } from "@/components/StaffShell";
import { Badge, Button, Card, Spinner, cx } from "@/components/ui";
import { api, type Activity, type LensOption, type Meta, type StaffPatientDetail } from "@/lib/api";
import { LANG_NAMES } from "@/lib/i18n";

export default function StaffPatient() {
  return <StaffShell>{(meta) => <Detail meta={meta} />}</StaffShell>;
}

function Detail({ meta }: { meta: Meta }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<StaffPatientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<StaffPatientDetail>(`/staff/patients/${id}`, { staff: true }).then(setD).catch((e) => setErr(String(e))), [id]);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const patch = async (body: object) => setD(await api<StaffPatientDetail>(`/staff/patients/${id}`, { method: "PATCH", json: body, staff: true }));
  const post = async (path: string, body?: object) => setD(await api<StaffPatientDetail>(`/staff/patients/${id}${path}`, { method: "POST", json: body ?? {}, staff: true }));
  const ack = async (aid: number, note: string) => { await api(`/staff/alerts/${aid}/ack`, { method: "POST", json: { note }, staff: true }); load(); };

  if (err) return <p className="text-danger">{err}</p>;
  if (!d) return <Spinner label="Loading record" />;
  const p = d.patient, rec = d.recommendation;
  const open = d.alerts.filter((a) => a.status === "open");
  const activities = rec?.activities || p.profile.activities || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/staff" className="mt-1 grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label="Back"><ArrowLeft size={18} /></Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">{p.name}</h1>
            <Badge tone={STAGE[p.stage].tone}>{STAGE[p.stage].label}</Badge>
          </div>
          <p className="text-[14px] text-muted">
            {[p.age && `${p.age}${p.sex || ""}`, p.occupation, p.city, LANG_NAMES[p.language], `${p.eye} eye (${p.eye === "right" ? "OD" : "OS"})`, p.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="inline-flex min-h-10 items-center rounded-full bg-surface-2 px-4 font-mono text-[14px] tracking-[.1em]">{p.id}</span>
          <a href={`/p/${p.id}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] hover:border-muted">Patient app <ExternalLink size={14} /></a>
        </div>
      </div>

      {open.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">{open.map((a) => <AlertItem key={a.id} a={a} onAck={ack} showPatient={false} />)}</ul>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {rec ? <Shortlist rec={rec} onApprove={(k, note) => post("/approve", { lens_key: k, note })} onReopen={() => post("/reopen")} /> : (
            <Card>
              <h2 className="text-[20px] font-semibold">Lens shortlist</h2>
              <p className="mt-2 text-muted">The patient is still talking to the assistant. The shortlist appears when the conversation ends, or you can rank now with what is known.</p>
              <Button className="mt-4" variant="soft" onClick={() => post("/recommend")}>Rank now</Button>
            </Card>
          )}
          {rec && (
            <Card>
              <div className="mb-4 flex flex-wrap items-baseline gap-3">
                <h2 className="text-[20px] font-semibold">Vision Day Map</h2>
                <p className="text-[13px] text-muted">Predicted acuity (Snellen) for each of the patient&apos;s activities, from each lens&apos;s defocus curve at that working distance.</p>
              </div>
              <DayMatrix activities={activities} options={rec.options} />
              <ActivityEditor activities={activities} prefs={{ glasses_free: p.profile.glasses_free ?? 2, budget: p.profile.budget ?? 1 }} onSave={(acts, prefs) => patch({ activities: acts, ...prefs })} />
            </Card>
          )}
          <Card>
            <h2 className="mb-1 text-[20px] font-semibold">Defocus curves × this patient</h2>
            <p className="mb-4 text-[13px] text-muted">Dashed lines mark the patient&apos;s activities at their vergence; ticks show the acuity each one needs.</p>
            <DefocusChart curves={meta.curves} activities={activities} highlight={rec?.options.find((o) => o.key === rec.approved_lens)?.family || rec?.options[0]?.family} />
          </Card>
          <Transcript d={d} />
        </div>

        <div className="flex flex-col gap-6">
          <BiometryCard d={d} onImport={async (file) => {
            const fd = new FormData(); fd.append("file", file);
            setD(await api<StaffPatientDetail>(`/staff/patients/${id}/biometry/import`, { method: "POST", body: fd, staff: true }));
          }} onSave={(b) => post("/biometry", b)} />
          <Card>
            <h2 className="mb-3 text-[17px] font-semibold">Ocular conditions</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(meta.conditions).map(([k, v]) => {
                const on = p.conditions.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => patch({ conditions: on ? p.conditions.filter((c) => c !== k) : [...p.conditions, k] })}
                    className={cx("min-h-9 rounded-full border px-3 text-left text-[13px]", on ? "border-warn bg-warn-bg text-warn" : "border-line text-muted hover:text-ink")}>{v}</button>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-muted">Changing conditions re-ranks the shortlist immediately.</p>
          </Card>
          <SurgeryCard d={d} onDate={(date) => patch(date ? { surgery_date: date } : { clear_surgery_date: true })} />
          <Card>
            <h2 className="mb-2 text-[17px] font-semibold">Data</h2>
            <p className="mb-3 text-[13px] text-muted">Consent {p.consent_at ? `given ${new Date(p.consent_at).toLocaleString()}` : "not yet given"}. Deleting removes every record (DPDP right to erasure).</p>
            <Button variant="danger" size="sm" onClick={async () => { if (confirm(`Delete all data for ${p.name}?`)) { await api(`/staff/patients/${id}`, { method: "DELETE", staff: true }); router.push("/staff"); } }}><Trash2 size={14} /> Delete patient</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(0)}`;

function Shortlist({ rec, onApprove, onReopen }: { rec: NonNullable<StaffPatientDetail["recommendation"]>; onApprove: (k: string, note: string) => void; onReopen: () => void }) {
  const [sel, setSel] = useState<string>(rec.approved_lens || rec.options.find((o) => !o.excluded)?.key || "");
  const [note, setNote] = useState(rec.surgeon_note || "");
  const approved = rec.status === "approved";
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-[20px] font-semibold">Lens shortlist</h2>
        {approved ? <Badge tone="ok"><Check size={12} /> Approved</Badge> : <Badge tone="warn">Awaiting your approval</Badge>}
        <span className="ml-auto font-mono text-[11px] text-muted">glasses-free wish {rec.preferences.glasses_free}/3 · cost sensitivity {rec.preferences.budget}/3</span>
      </div>
      {(rec.astigmatism.cyl != null || rec.biometry_notes.length > 0) && (
        <div className="mb-4 flex flex-col gap-1.5 rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px]">
          {rec.astigmatism.cyl != null && (
            <p>Corneal astigmatism <b>{rec.astigmatism.cyl} D</b>{rec.astigmatism.axis != null ? ` @ ${rec.astigmatism.axis}°` : ""}:{" "}
              {rec.astigmatism.toric ? <span className="text-warn">toric indicated (≈ {rec.astigmatism.iol_cyl_estimate} D at IOL plane; confirm with a toric calculator)</span> : rec.astigmatism.borderline ? "borderline, consider toric" : "no toric needed"}</p>
          )}
          {rec.biometry_notes.map((n) => <p key={n.text} className="text-warn">⚠ {n.text}</p>)}
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {rec.options.map((o, i) => (
          <OptionCard key={o.key} o={o} rank={i + 1} selected={sel === o.key} onSelect={() => !approved && !o.excluded && setSel(o.key)} approved={rec.approved_lens === o.key} locked={approved} />
        ))}
      </ol>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
        {approved ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[14px]">Approved <b>{rec.options.find((o) => o.key === rec.approved_lens)?.name}</b>{rec.surgeon_note ? ` · “${rec.surgeon_note}”` : ""}. The patient now sees it in their app.</p>
            <Button variant="soft" size="sm" className="ml-auto" onClick={onReopen}><RotateCcw size={14} /> Revise</Button>
          </div>
        ) : (
          <>
            <label className="text-[13px] text-muted" htmlFor="note">Note to the patient (shown in their app, in plain words)</label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. We discussed halos at night; you'll need light reading glasses for fine print."
              className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[15px] focus:border-sky focus:outline-none" />
            <Button size="lg" disabled={!sel} onClick={() => onApprove(sel, note)}>Approve {rec.options.find((o) => o.key === sel)?.name}</Button>
          </>
        )}
        <p className="text-[11.5px] leading-relaxed text-muted">{rec.disclaimer}</p>
      </div>
    </Card>
  );
}

function OptionCard({ o, rank, selected, onSelect, approved, locked }: { o: LensOption; rank: number; selected: boolean; onSelect: () => void; approved: boolean; locked: boolean }) {
  const max = Math.max(0.05, ...o.contributions.map((c) => Math.abs(c.value)), ...o.adjustments.map((a) => Math.abs(a.value)));
  const bars = [...o.contributions.filter((c) => Math.abs(c.value) >= 0.003).slice(0, 6).map((c) => ({ label: c.label, value: c.value })), ...o.adjustments.map((a) => ({ label: a.reason.split(":")[0], value: a.value }))];
  return (
    <li>
      <div role="radio" aria-checked={selected} tabIndex={o.excluded || locked ? -1 : 0} onClick={onSelect} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onSelect()}
        className={cx("rounded-2xl border p-4 transition", o.excluded ? "border-line opacity-60" : "cursor-pointer", selected && !o.excluded ? "border-accent bg-accent/5" : "border-line hover:border-muted", approved && "border-ok")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[12px] text-muted">#{rank}</span>
          <h3 className="text-[18px] font-semibold">{o.name}</h3>
          {o.excluded && <Badge tone="danger">Not suitable</Badge>}
          {approved && <Badge tone="ok">Approved</Badge>}
          <span className="ml-auto font-mono text-[22px] font-medium">{o.excluded ? "—" : o.score.toFixed(2)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={cx("h-full rounded-full", o.excluded ? "bg-muted" : "bg-accent")} style={{ width: `${o.excluded ? 0 : o.score * 100}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] text-muted">
          <span><b className="font-medium text-ink">{o.hours_clear}/{o.hours_total} h</b> clear w/o glasses</span>
          <span>IOL <b className="font-medium text-ink">{o.iol_power_d != null ? `${o.iol_power_d > 0 ? "+" : ""}${o.iol_power_d.toFixed(1)} D` : "—"}</b> SRK/T · A {o.a_constant}</span>
          <span>cost {"₹".repeat(o.cost_tier)}</span>
          <span>glasses: {o.glasses_after.toLowerCase()}</span>
        </div>
        {!o.excluded && (
          <div className="mt-3 grid gap-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[.1em] text-muted">Why (vs. average lens = {pct(o.baseline)})</p>
            {bars.map((b) => (
              <div key={b.label} className="grid grid-cols-[minmax(0,150px)_1fr_48px] items-center gap-2 text-[12.5px]">
                <span className="truncate text-muted" title={b.label}>{b.label}</span>
                <div className="relative h-2.5">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                  <div className={cx("absolute inset-y-0 rounded-sm", b.value >= 0 ? "left-1/2 bg-ok" : "right-1/2 bg-danger")} style={{ width: `${(Math.abs(b.value) / max) * 50}%` }} />
                </div>
                <span className={cx("text-right font-mono", b.value >= 0 ? "text-ok" : "text-danger")}>{b.value >= 0 ? "+" : "−"}{pct(Math.abs(b.value))}</span>
              </div>
            ))}
          </div>
        )}
        {o.flags.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-[12.5px]">
            {o.flags.map((f) => <li key={f.text} className={f.level === "contraindicated" ? "text-danger" : f.level === "caution" ? "text-warn" : "text-sky"}>• {f.text}</li>)}
          </ul>
        )}
        {o.example_models && <p className="mt-2 font-mono text-[11px] text-muted">{o.example_models}</p>}
      </div>
    </li>
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
  const cell = "min-h-9 rounded-lg border border-line bg-surface-2 px-2 text-[13px]";
  if (!open) return <Button variant="soft" size="sm" className="mt-4" onClick={() => setOpen(true)}><Pencil size={14} /> Correct activities &amp; preferences</Button>;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line p-4">
      {rows.map((a, i) => (
        <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1.6fr_1.3fr_.7fr_.8fr_.8fr_auto]">
          <input className={cx(cell, "col-span-2 sm:col-span-1")} value={a.label} onChange={(e) => upd(i, "label", e.target.value)} aria-label="Activity" />
          <select className={cell} value={a.distance_cm} onChange={(e) => upd(i, "distance_cm", Number(e.target.value))} aria-label="Distance">
            {[...PRESETS, ...(PRESETS.some((p) => p.cm === a.distance_cm) ? [] : [{ label: `${a.distance_cm} cm`, cm: a.distance_cm }])].map((p) => <option key={p.cm} value={p.cm}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-[12px] text-muted"><input className={cx(cell, "w-14")} type="number" min={0.25} max={16} step={0.5} value={a.hours} onChange={(e) => upd(i, "hours", Number(e.target.value))} /> h</label>
          <select className={cell} value={a.detail} onChange={(e) => upd(i, "detail", e.target.value)} aria-label="Detail"><option value="fine">fine</option><option value="normal">normal</option><option value="coarse">coarse</option></select>
          <select className={cell} value={a.importance} onChange={(e) => upd(i, "importance", Number(e.target.value))} aria-label="Importance"><option value={1}>★ low</option><option value={2}>★★ med</option><option value={3}>★★★ high</option></select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[12px] text-muted"><input type="checkbox" checked={a.night} onChange={(e) => upd(i, "night", e.target.checked)} /> night</label>
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove" className="text-muted hover:text-danger"><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setRows([...rows, { id: `custom_${rows.length}`, label: "New activity", distance_cm: 40, detail: "normal", night: false, hours: 1, importance: 2 }])}><Plus size={14} /> Add activity</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] text-muted">Wants to avoid glasses: <b className="text-ink">{pr.glasses_free}</b>/3<input type="range" min={0} max={3} step={0.5} value={pr.glasses_free} onChange={(e) => setPr({ ...pr, glasses_free: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></label>
        <label className="text-[13px] text-muted">Cost sensitivity: <b className="text-ink">{pr.budget}</b>/3<input type="range" min={0} max={3} step={0.5} value={pr.budget} onChange={(e) => setPr({ ...pr, budget: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(rows, pr); setOpen(false); } finally { setBusy(false); } }}>Save &amp; re-rank</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function BiometryCard({ d, onImport, onSave }: { d: StaffPatientDetail; onImport: (f: File) => Promise<void>; onSave: (b: object) => Promise<void> }) {
  const b = d.biometry;
  const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ axial_length: b?.axial_length ?? "", k1: b?.k1 ?? "", k2: b?.k2 ?? "", k2_axis: b?.k2_axis ?? "", acd: b?.acd ?? "", wtw: b?.wtw ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const rows: [string, string][] = b ? [
    ["Axial length", `${b.axial_length.toFixed(2)} mm`], ["K1 / K2", `${b.k1.toFixed(2)} / ${b.k2.toFixed(2)} D`],
    ["Corneal cyl", `${Math.abs(b.k2 - b.k1).toFixed(2)} D${b.k2_axis != null ? ` @ ${b.k2_axis}°` : ""}`],
    ["ACD", b.acd != null ? `${b.acd.toFixed(2)} mm` : "—"], ["WTW", b.wtw != null ? `${b.wtw.toFixed(1)} mm` : "—"],
  ] : [];
  const inp = "min-h-9 w-full rounded-lg border border-line bg-surface-2 px-2 font-mono text-[13px]";
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[17px] font-semibold">Biometry</h2>
        <span className="ml-auto font-mono text-[11px] text-muted">{d.patient.eye === "right" ? "OD" : "OS"}</span>
      </div>
      {b ? (
        <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 font-mono text-[13.5px]">
          {rows.map(([k, v]) => <Fragment key={k}><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></Fragment>)}
        </dl>
      ) : <p className="text-[14px] text-muted">No measurements yet.</p>}
      {b && <p className="mt-2 font-mono text-[11px] text-muted">{b.source}</p>}
      {edit && (
        <form className="mt-3 grid grid-cols-3 gap-2" onSubmit={async (e) => { e.preventDefault(); try { await onSave(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)]))); setEdit(false); setErr(null); } catch (x) { setErr(String(x)); } }}>
          {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
            <label key={k} className="text-[11px] text-muted">{k.replace("_", " ")}<input className={inp} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
          ))}
          <Button type="submit" size="sm" className="col-span-3">Save measurements</Button>
        </form>
      )}
      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={file} type="file" accept=".csv,.json,.txt" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) { try { await onImport(fl); setErr(null); } catch (x) { setErr(String(x)); } } e.target.value = ""; }} />
        <Button size="sm" variant="soft" onClick={() => file.current?.click()}><FileUp size={14} /> Import biometer export</Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit(!edit)}><Pencil size={14} /> Enter manually</Button>
      </div>
    </Card>
  );
}

function SurgeryCard({ d, onDate }: { d: StaffPatientDetail; onDate: (date: string | null) => void }) {
  const [date, setDate] = useState(d.patient.surgery_date || "");
  const r = d.recovery;
  const canSchedule = d.patient.stage === "approved" || d.patient.stage === "post_op";
  return (
    <Card>
      <h2 className="mb-3 text-[17px] font-semibold">Surgery &amp; recovery</h2>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-10 flex-1 rounded-xl border border-line bg-surface-2 px-3 font-mono text-[14px]" aria-label="Surgery date" />
        <Button size="sm" disabled={!date || !canSchedule} onClick={() => onDate(date)}>Set</Button>
      </div>
      {!canSchedule && <p className="mt-2 text-[12px] text-muted">Approve a lens first; setting the date then builds the drop schedule from the clinic protocol.</p>}
      {r && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface-2 p-3"><p className="font-mono text-[22px]">{r.day ?? "—"}</p><p className="text-[11px] text-muted">post-op day</p></div>
            <div className="rounded-2xl bg-surface-2 p-3"><p className={cx("font-mono text-[22px]", (r.adherence.pct ?? 100) < 85 && "text-warn")}>{r.adherence.pct ?? "—"}%</p><p className="text-[11px] text-muted">drops taken</p></div>
            <div className="rounded-2xl bg-surface-2 p-3"><p className={cx("font-mono text-[22px]", r.adherence.missed > 0 && "text-danger")}>{r.adherence.missed}</p><p className="text-[11px] text-muted">missed</p></div>
          </div>
          {r.today.length > 0 && (
            <ul className="flex flex-col gap-1 font-mono text-[12.5px]">
              {r.today.map((x) => <li key={x.id} className="flex justify-between"><span>{x.due_at.slice(11, 16)} {x.drug}</span><span className={x.status === "taken" ? "text-ok" : x.status === "missed" ? "text-danger" : "text-muted"}>{x.status}</span></li>)}
            </ul>
          )}
          <p className="font-mono text-[11px] text-muted">Follow-ups: {r.follow_ups.map((f) => f.date).join(" · ")}</p>
        </div>
      )}
    </Card>
  );
}

function Transcript({ d }: { d: StaffPatientDetail }) {
  const [ch, setCh] = useState<"intake" | "recovery">("intake");
  const msgs = d.messages.filter((m) => m.channel === ch);
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-[20px] font-semibold">Conversation</h2>
        <div className="ml-auto flex gap-1.5">
          {(["intake", "recovery"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCh(c)} className={cx("min-h-9 rounded-full border px-3 text-[13px]", ch === c ? "border-ink bg-ink text-bg" : "border-line text-muted")}>
              {c === "intake" ? "Before surgery" : "Questions & recovery"} <span className="font-mono opacity-70">{d.messages.filter((m) => m.channel === c).length}</span>
            </button>
          ))}
        </div>
      </div>
      {msgs.length === 0 ? <p className="text-[14px] text-muted">No messages yet.</p> : (
        <ol className="flex flex-col gap-3">
          {msgs.map((m) => (
            <li key={m.id} className={cx("grid grid-cols-[72px_1fr] gap-3 text-[14px]", m.meta.kind === "safety" && "rounded-xl bg-danger-bg p-2")}>
              <span className={cx("font-mono text-[11px] uppercase", m.role === "patient" ? "text-accent-text" : "text-muted")}>{m.role === "patient" ? "Patient" : "Assistant"}</span>
              <div>
                <p lang={m.lang}>{m.text}</p>
                {m.text_en && m.text_en !== m.text && <p className="text-[13px] text-muted">{m.text_en}</p>}
                {!!m.meta.extracted?.length && <p className="mt-1 font-mono text-[11px] text-sky">→ understood: {m.meta.extracted.join(", ")}</p>}
                {!!m.meta.citations?.length && <p className="mt-1 font-mono text-[11px] text-sky">cites {m.meta.citations.map((c) => c.id).join(", ")}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
