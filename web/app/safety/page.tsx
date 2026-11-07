"use client";

import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Logo, Spinner, ThemeToggle, cx } from "@/components/ui";
import { api } from "@/lib/api";

type RF = {
  n: number; urgent_recall: number; urgent_missed: number; any_flag_recall: number; false_alarm_rate: number; exact: number;
  confusion: Record<string, number>; by_lang: Record<string, { n: number; urgent_recall: number | null; exact: number }>;
  errors: { id: string; lang: string; text: string; label: string; pred: string; under_triage: boolean }[];
};
type QA = { n: number; top1: number; abstain_correct: number; by_lang: Record<string, number>; errors: { id: string; text: string; expected: string | null; got: string | null }[] };
type Score = {
  method: string; counts: { redflag: number; qa: number; languages: string[] };
  history: { date: string; event: string; test_before_tuning: { urgent_recall: number; urgent_missed: number; false_alarm_rate: number }; test_after_tuning: { n: number; urgent_recall: number; urgent_missed: number; false_alarm_rate: number }; note: string }[];
  redflag: { dev: RF; test: RF }; qa: { dev: QA; test: QA };
};
type Triage = { severity: "urgent" | "soon" | null; categories: string[]; matched: string[]; intense: boolean; worsening: boolean };

const LANG: Record<string, string> = { en: "English", kn: "ಕನ್ನಡ", hi: "हिन्दी", ta: "தமிழ்" };
const EXAMPLES = ["kannu tumba novu", "आँख लाल है और दर्द बढ़ रहा है", "பார்வை திடீரென்று குறைந்தது", "no pain, can I take a bath?", "ನೋವು ಇಲ್ಲ, ತುರಿಕೆ ಇದೆ", "I see flashes of light"];

export default function Safety() {
  const [sc, setSc] = useState<Score | null>(null);
  const [text, setText] = useState("");
  const [res, setRes] = useState<Triage | null>(null);
  useEffect(() => { api<Score>("/safety").then(setSc); }, []);
  const run = async (t: string) => { setText(t); setRes(t.trim() ? await api<Triage>("/safety/try", { method: "POST", json: { text: t } }) : null); };

  if (!sc) return <div className="grid min-h-dvh place-items-center"><Spinner label="Running the scorecard" /></div>;
  const h = sc.history[0];
  const all = (k: "dev" | "test") => sc.redflag[k];
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label="Home"><ArrowLeft size={18} /></Link>
        <Logo />
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      <section className="mt-10 max-w-3xl">
        <p className="eyebrow mb-3 flex items-center gap-2"><ShieldCheck size={14} /> Safety scorecard</p>
        <h1 className="text-[clamp(32px,5vw,54px)] font-semibold leading-[1] tracking-[-0.04em]">We measure whether the assistant <span className="serif text-accent-text">recognises an emergency.</span></h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted">
          Every patient message passes a rule-based red-flag check that works without any AI. Here it is scored on {sc.counts.redflag} labelled messages in Kannada, Hindi, Tamil, English, and romanised or code-mixed typing.
          The test messages were written before the rules were tuned and kept aside.
        </p>
      </section>

      {h && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Emergencies recognised (held-out test)" before={`${h.test_before_tuning.urgent_recall}%`} after={`${h.test_after_tuning.urgent_recall}%`} good />
          <Stat label="Emergencies missed entirely (held-out)" before={String(h.test_before_tuning.urgent_missed)} after={String(h.test_after_tuning.urgent_missed)} good />
          <Stat label="False alarms on normal messages (held-out)" before={`${h.test_before_tuning.false_alarm_rate}%`} after={`${h.test_after_tuning.false_alarm_rate}%`} good />
        </div>
      )}
      {h && <p className="mt-3 text-[13px] text-muted">Before → after replacing phrase lists with stems, symptom + intensity composition and per-language negation, tuned on the dev split only. {h.note}</p>}

      <Card className="mt-8 p-6">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold"><FlaskConical size={20} className="text-sky" /> Try it</h2>
        <p className="mt-1 text-[14px] text-muted">Type any message a patient might send, in any of the four languages. Nothing is stored.</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. ಕಣ್ಣು ತುಂಬಾ ನೋವಾಗುತ್ತಿದೆ" className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-5 text-[16px] focus:border-sky focus:outline-none" />
          <Button type="submit" size="lg">Triage</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => run(e)} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink">{e}</button>)}</div>
        {res && (
          <div className={cx("mt-4 rounded-2xl px-4 py-3", res.severity === "urgent" ? "bg-danger-bg" : res.severity === "soon" ? "bg-warn-bg" : "bg-ok-bg")}>
            <p className={cx("text-[18px] font-semibold", res.severity === "urgent" ? "text-danger" : res.severity === "soon" ? "text-warn" : "text-ok")}>
              {res.severity === "urgent" ? "Urgent: surgeon alerted, call buttons shown" : res.severity === "soon" ? "Soon: shared with the clinic team today" : "No red flag: answered from the clinic guide"}
            </p>
            {res.categories.length > 0 && <p className="mt-1 font-mono text-[12px] text-muted">{res.categories.join(", ")} · matched “{res.matched.join("”, “")}”{res.intense ? " · intensity" : ""}{res.worsening ? " · worsening" : ""}</p>}
          </div>
        )}
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {(["dev", "test"] as const).map((k) => (
          <Card key={k} className="p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold">{k === "test" ? "Held-out test set (current)" : "Dev set (used for tuning)"}</h2>
              <Badge tone={all(k).urgent_missed === 0 ? "ok" : "danger"} className="ml-auto">{all(k).n} messages</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini k="Urgent recall" v={`${all(k).urgent_recall}%`} />
              <Mini k="Any-flag recall" v={`${all(k).any_flag_recall}%`} />
              <Mini k="False alarms" v={`${all(k).false_alarm_rate}%`} />
              <Mini k="Exact level" v={`${all(k).exact}%`} />
            </dl>
            <table className="mt-5 w-full text-[13.5px]">
              <thead><tr className="text-left"><th className="eyebrow pb-2 font-normal">Language</th><th className="eyebrow pb-2 font-normal">n</th><th className="eyebrow pb-2 font-normal">Urgent recall</th><th className="eyebrow pb-2 font-normal">Exact</th></tr></thead>
              <tbody>{Object.entries(all(k).by_lang).map(([l, v]) => (
                <tr key={l} className="border-t border-line"><td className="py-2">{LANG[l] || l}</td><td className="font-mono">{v.n}</td><td className="font-mono">{v.urgent_recall ?? "—"}%</td><td className="font-mono">{v.exact}%</td></tr>
              ))}</tbody>
            </table>
            {all(k).errors.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1 text-[13px]">
                {all(k).errors.map((e) => <li key={e.id} className={e.under_triage ? "text-danger" : "text-warn"}>{e.label} → {e.pred}: “{e.text}”</li>)}
              </ul>
            )}
            <p className="mt-4 font-mono text-[11px] text-muted">Q&amp;A: right guide section {sc.qa[k].top1}% · correctly says “not in the guide” {sc.qa[k].abstain_correct}% ({sc.qa[k].n} questions)</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-[18px] font-semibold">How to read this honestly</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] text-muted">
          <li>• {sc.method}</li>
          <li>• Urgent recall is the number that matters: a missed emergency is the dangerous error, and a false alarm costs one phone call. The rules are deliberately biased towards escalating.</li>
          <li>• When an AI provider is configured it can only raise a triage level, never lower one, so these numbers are the floor.</li>
          <li>• The build fails if any emergency in this set is missed (backend test <code className="font-mono text-[12.5px]">test_scorecard_safety_floor</code>).</li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, before, after, good }: { label: string; before: string; after: string; good?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-3">
        <span className="font-mono text-[18px] text-muted line-through decoration-1">{before}</span>
        <span className={cx("font-mono text-[34px] font-medium", good && "text-ok")}>{after}</span>
      </p>
    </Card>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-[11px] text-muted">{k}</dt><dd className="font-mono text-[20px]">{v}</dd></div>;
}
