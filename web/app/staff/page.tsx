"use client";

import { BellRing, Plus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertItem, STAGE, StaffShell } from "@/components/StaffShell";
import { Badge, Button, Card, cx } from "@/components/ui";
import { api, type Alert, type Lang, type Meta, type StaffPatientRow } from "@/lib/api";
import { LANG_NAMES } from "@/lib/i18n";

export default function StaffHome() {
  return <StaffShell>{(meta) => <Dashboard meta={meta} />}</StaffShell>;
}

function Dashboard({ meta }: { meta: Meta }) {
  const [rows, setRows] = useState<StaffPatientRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const [p, a] = await Promise.all([api<StaffPatientRow[]>("/staff/patients", { staff: true }), api<Alert[]>("/staff/alerts", { staff: true })]);
    setRows(p); setAlerts(a);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const ack = async (id: number, note: string) => { await api(`/staff/alerts/${id}/ack`, { method: "POST", json: { note }, staff: true }); load(); };
  const counts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.stage]: (m[r.stage] || 0) + 1 }), {});
  const shown = filter === "all" ? rows : rows.filter((r) => r.stage === filter);
  const urgent = alerts.filter((a) => a.severity === "urgent").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div>
            <p className="eyebrow">Today</p>
            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Patients</h1>
          </div>
          <Button className="ml-auto" onClick={() => setAdding(true)}><Plus size={18} /> New patient</Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {[["all", "All", rows.length], ...Object.entries(STAGE).map(([k, v]) => [k, v.label, counts[k] || 0])].map(([k, l, n]) => (
            <button key={k as string} type="button" onClick={() => setFilter(k as string)}
              className={cx("min-h-9 rounded-full border px-3.5 text-[13px]", filter === k ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink")}>
              {l} <span className="ml-1 font-mono opacity-70">{n}</span>
            </button>
          ))}
        </div>
        {adding && <NewPatient meta={meta} onClose={() => setAdding(false)} onCreated={load} />}
        <ul className="flex flex-col gap-2.5">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/staff/${r.id}`} className={cx("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-3xl border bg-surface px-5 py-4 transition hover:border-muted sm:grid-cols-[1.4fr_1fr_1fr_auto]", r.urgent_alerts ? "border-danger/60" : "border-line")}>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{r.name} <span className="font-normal text-muted">{r.age ? `· ${r.age}${r.sex || ""}` : ""}</span></p>
                  <p className="truncate text-[13px] text-muted">{[r.occupation, r.city, LANG_NAMES[r.language as Lang], `${r.eye} eye`].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="order-last col-span-2 sm:order-none sm:col-span-1"><Badge tone={STAGE[r.stage].tone}>{STAGE[r.stage].label}</Badge></div>
                <div className="hidden text-[14px] sm:block">
                  {r.lens ? <><span className="font-medium">{r.lens.name}</span> <span className="font-mono text-[12px] text-muted">{r.lens.approved ? "approved" : r.lens.score.toFixed(2)}</span></> : <span className="text-muted">—</span>}
                  {r.adherence?.pct != null && <p className="font-mono text-[12px] text-muted">Day {r.day} · drops {r.adherence.pct}%</p>}
                </div>
                <div className="flex items-center gap-2 justify-self-end">
                  {r.urgent_alerts > 0 && <Badge tone="danger"><BellRing size={12} /> {r.urgent_alerts}</Badge>}
                  {r.open_alerts - r.urgent_alerts > 0 && <Badge tone="warn">{r.open_alerts - r.urgent_alerts}</Badge>}
                  <span className="font-mono text-[12px] text-muted">{r.id}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BellRing size={18} className={urgent ? "text-danger" : "text-muted"} />
            <h2 className="text-[18px] font-semibold">Alerts</h2>
            <Badge tone={urgent ? "danger" : "neutral"} className="ml-auto">{alerts.length} open</Badge>
          </div>
          {alerts.length === 0 ? <p className="text-[14px] text-muted">Nothing waiting. Red-flag symptoms and unanswered questions appear here within seconds.</p> : (
            <ul className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
              {alerts.map((a) => <AlertItem key={a.id} a={a} onAck={ack} />)}
            </ul>
          )}
          <p className="mt-4 font-mono text-[11px] text-muted">Live · refreshes every 8 s</p>
        </Card>
      </aside>
    </div>
  );
}

function NewPatient({ meta, onClose, onCreated }: { meta: Meta; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ name: "", age: "", sex: "", phone: "", city: "", occupation: "", language: "kn", eye: "right", al: "", k1: "", k2: "", axis: "", acd: "" });
  const [conds, setConds] = useState<string[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bio = f.al && f.k1 && f.k2 ? { axial_length: num(f.al), k1: num(f.k1), k2: num(f.k2), k2_axis: num(f.axis), acd: num(f.acd), source: "manual" } : undefined;
      const r = await api<{ id: string }>("/staff/patients", { method: "POST", staff: true, json: {
        name: f.name, age: num(f.age), sex: f.sex || undefined, phone: f.phone || undefined, city: f.city || undefined, occupation: f.occupation || undefined,
        language: f.language, eye: f.eye, conditions: conds, biometry: bio } });
      setCreated(r.id); onCreated();
    } catch (e) { setErr(String(e)); }
  };
  const input = "min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[15px] focus:border-sky focus:outline-none";
  const link = created ? `${location.origin}/p/${created}` : "";
  return (
    <Card className="mb-5 p-6">
      <div className="mb-4 flex items-center"><h2 className="text-[18px] font-semibold">New patient</h2><button type="button" onClick={onClose} className="ml-auto text-muted" aria-label="Close"><X /></button></div>
      {created ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px]">Created. Give the patient this code or link; the assistant takes over from there.</p>
          <p className="rounded-2xl bg-surface-2 px-4 py-3 font-mono text-[22px] tracking-[.12em]">{created}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => navigator.clipboard?.writeText(link)}>Copy link</Button>
            <a className="inline-flex min-h-11 items-center rounded-full border border-line px-5" href={`https://wa.me/?text=${encodeURIComponent(`Your DrishtiSaathi link from ${meta.clinic.name}: ${link}`)}`} target="_blank" rel="noopener">Send on WhatsApp</a>
            <Link className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-on-accent" href={`/staff/${created}`}>Open record</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-3"><span className="eyebrow">Name</span><input required className={input} value={f.name} onChange={set("name")} /></label>
          <label><span className="eyebrow">Age</span><input className={input} inputMode="numeric" value={f.age} onChange={set("age")} /></label>
          <label><span className="eyebrow">Sex</span><select className={input} value={f.sex} onChange={set("sex")}><option value="">—</option><option>F</option><option>M</option><option>Other</option></select></label>
          <label><span className="eyebrow">Eye</span><select className={input} value={f.eye} onChange={set("eye")}><option value="right">Right (OD)</option><option value="left">Left (OS)</option></select></label>
          <label className="sm:col-span-2"><span className="eyebrow">Language</span><select className={input} value={f.language} onChange={set("language")}>{Object.entries(LANG_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="eyebrow">Phone</span><input className={input} value={f.phone} onChange={set("phone")} /></label>
          <label className="sm:col-span-2"><span className="eyebrow">City</span><input className={input} value={f.city} onChange={set("city")} /></label>
          <label className="sm:col-span-6"><span className="eyebrow">Occupation</span><input className={input} value={f.occupation} onChange={set("occupation")} /></label>
          <fieldset className="sm:col-span-6">
            <legend className="eyebrow mb-1.5">Ocular conditions</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(meta.conditions).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={conds.includes(k)} onClick={() => setConds(conds.includes(k) ? conds.filter((c) => c !== k) : [...conds, k])}
                  className={cx("min-h-9 rounded-full border px-3 text-[13px]", conds.includes(k) ? "border-warn bg-warn-bg text-warn" : "border-line text-muted")}>{v}</button>
              ))}
            </div>
          </fieldset>
          <p className="eyebrow sm:col-span-6">Biometry (optional, can be imported later)</p>
          <label><span className="eyebrow">AL mm</span><input className={input} inputMode="decimal" value={f.al} onChange={set("al")} /></label>
          <label><span className="eyebrow">K1 D</span><input className={input} inputMode="decimal" value={f.k1} onChange={set("k1")} /></label>
          <label><span className="eyebrow">K2 D</span><input className={input} inputMode="decimal" value={f.k2} onChange={set("k2")} /></label>
          <label><span className="eyebrow">K2 axis °</span><input className={input} inputMode="numeric" value={f.axis} onChange={set("axis")} /></label>
          <label><span className="eyebrow">ACD mm</span><input className={input} inputMode="decimal" value={f.acd} onChange={set("acd")} /></label>
          <div className="flex items-end"><Button type="submit" className="w-full">Create</Button></div>
          {err && <p className="text-danger sm:col-span-6">{err}</p>}
        </form>
      )}
    </Card>
  );
}
