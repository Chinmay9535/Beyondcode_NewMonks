"use client";

import { CalendarCheck, Droplet, Eye, HeartPulse, Languages, MessageCircleQuestion, MessagesSquare, Share2, Trash2, Volume2, VolumeX, ScanEye } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer, MessageList } from "@/components/Chat";
import { PatientDayMap } from "@/components/DayMap";
import Simulator from "@/components/Simulator";
import VisionTest from "@/components/VisionTest";
import { Badge, Button, Card, Logo, Spinner, ThemeToggle, cx } from "@/components/ui";
import { ApiError, api, type Lang, type LensOption, type Message, type Meta, type PatientView, type Recovery } from "@/lib/api";
import { LANG_NAMES, planName, tr } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/speech";

type Tab = "talk" | "lens" | "recovery" | "test" | "ask";

export default function PatientApp() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [me, setMe] = useState<PatientView | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("talk");
  const [intakeMsgs, setIntakeMsgs] = useState<Message[]>([]);
  const [askMsgs, setAskMsgs] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const lang: Lang = me?.language || "en";

  const load = useCallback(async () => {
    try {
      const [v, m] = await Promise.all([api<PatientView>(`/p/${code}`), api<Meta>("/meta")]);
      setMe(v); setMeta(m);
      const [im, am] = await Promise.all([api<Message[]>(`/p/${code}/messages?channel=intake`), api<Message[]>(`/p/${code}/messages?channel=recovery`)]);
      setIntakeMsgs(im); setAskMsgs(am);
      setTab((t) => (t !== "talk" ? t : v.stage === "post_op" ? "recovery" : v.stage === "approved" ? "lens" : "talk"));
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 404 ? "notfound" : String(e));
    }
  }, [code]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const say = useCallback((msgs: Message[]) => {
    if (!autoSpeak) return;
    const last = [...msgs].reverse().find((m) => m.role === "assistant");
    if (last) speak(last.text, lang, !!meta?.tts);
  }, [autoSpeak, lang, meta?.tts]);

  const consent = async () => {
    await api(`/p/${code}/consent`, { method: "POST" });
    const r = await api<{ patient: PatientView; messages: Message[] }>(`/p/${code}/intake/start`, { method: "POST" });
    setMe(r.patient); setIntakeMsgs(r.messages); say(r.messages);
  };

  // Start the conversation once consent exists but no question has been asked yet.
  const started = useRef(false);
  useEffect(() => {
    if (me?.consented && me.stage === "intake" && !me.intake?.started && !started.current) {
      started.current = true;
      api<{ patient: PatientView; messages: Message[] }>(`/p/${code}/intake/start`, { method: "POST" }).then((r) => { setMe(r.patient); setIntakeMsgs(r.messages); });
    }
  }, [me, code]);

  const sendIntake = async (text: string, choice?: string) => {
    setBusy(true);
    try {
      const r = await api<{ messages: Message[]; patient: PatientView; done: boolean }>(`/p/${code}/intake`, { method: "POST", json: { text, choice } });
      setIntakeMsgs((m) => [...m, ...r.messages]); setMe(r.patient); say(r.messages);
    } finally { setBusy(false); }
  };
  const sendAsk = async (text: string) => {
    setBusy(true);
    try {
      const r = await api<{ messages: Message[] }>(`/p/${code}/ask`, { method: "POST", json: { text } });
      setAskMsgs((m) => [...m, ...r.messages]); say(r.messages);
    } finally { setBusy(false); }
  };
  const setLang = async (l: Lang) => { stopSpeaking(); setMe(await api<PatientView>(`/p/${code}`, { method: "PATCH", json: { language: l } })); };
  const erase = async () => {
    if (!confirm(tr(lang, "eraseConfirm"))) return;
    await api(`/p/${code}`, { method: "DELETE" });
    router.push("/");
  };

  if (err === "notfound") return <Center><Card className="max-w-md text-center"><p className="text-[17px]">{tr("en", "notFoundCode")}</p><Button className="mt-4" onClick={() => router.push("/")}>Back</Button></Card></Center>;
  if (err) return <Center><p className="text-danger">{err}</p></Center>;
  if (!me || !meta) return <Center><Spinner /></Center>;

  const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "talk", label: tr(lang, "tabTalk"), Icon: MessagesSquare },
    { id: "lens", label: tr(lang, "tabLens"), Icon: ScanEye },
    ...(me.recovery ? [{ id: "recovery" as Tab, label: tr(lang, "tabRecovery"), Icon: HeartPulse }] : []),
    { id: "test", label: tr(lang, "tabTest"), Icon: Eye },
    { id: "ask", label: tr(lang, "tabAsk"), Icon: MessageCircleQuestion },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col" lang={lang}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Logo size={24} />
        <div className="ml-auto flex items-center gap-1.5">
          <label className="relative inline-flex h-10 items-center gap-1.5 rounded-full border border-line pl-3 pr-2 text-[14px]">
            <Languages size={16} className="text-muted" />
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="appearance-none bg-transparent pr-1 focus:outline-none" aria-label="Language">
              {(Object.keys(LANG_NAMES) as Lang[]).map((l) => <option key={l} value={l} className="bg-surface text-ink">{LANG_NAMES[l]}</option>)}
            </select>
          </label>
          {lang !== "en" && (
            <button type="button" onClick={() => setShowEn(!showEn)} aria-pressed={showEn} title={tr(lang, "showEnglish")}
              className={cx("h-10 rounded-full border px-3 font-mono text-[12px]", showEn ? "border-sky text-sky" : "border-line text-muted")}>EN</button>
          )}
          <button type="button" onClick={() => { setAutoSpeak(!autoSpeak); stopSpeaking(); }} aria-pressed={autoSpeak} aria-label={tr(lang, "readAloud")}
            className={cx("grid h-10 w-10 place-items-center rounded-full border", autoSpeak ? "border-accent text-accent-text" : "border-line text-muted")}>
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {!me.consented ? (
        <main className="flex flex-1 flex-col justify-center gap-6 px-5 py-10">
          <p className="eyebrow">{tr(lang, "tagline")}</p>
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em]">{tr(lang, "consentTitle")}, {me.name.split(" ")[0]}</h1>
          <p className="text-[18px] leading-relaxed text-muted">{tr(lang, "consentBody")}</p>
          <p className="text-[14px] text-muted">{me.clinic.name} · {me.clinic.surgeon}</p>
          <Button size="lg" onClick={consent}>{tr(lang, "consentAgree")}</Button>
        </main>
      ) : (
        <>
          <main className="flex-1 px-4 pb-32 pt-5">
            {tab === "talk" && <TalkTab me={me} msgs={intakeMsgs} busy={busy} showEn={showEn} onSend={sendIntake} meta={meta} />}
            {tab === "lens" && <LensTab me={me} meta={meta} />}
            {tab === "recovery" && me.recovery && <RecoveryTab me={me} code={code} onChange={(r) => setMe({ ...me, recovery: r })} onCheckin={(m) => { setAskMsgs((x) => [...x, ...m]); say(m); }} />}
            {tab === "test" && <VisionTest code={code} lang={lang} clinic={me.clinic} operatedEye={me.stage === "post_op" ? me.eye : null} onSafety={(m) => { setAskMsgs((x) => [...x, ...m]); say(m); }} />}
            {tab === "ask" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{tr(lang, "askTitle")}</h2>
                  <p className="mt-1 text-[14px] text-muted">{tr(lang, "askHint")}</p>
                </div>
                {askMsgs.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tr(lang, "askExamples").split("|").map((q) => <Button key={q} variant="soft" onClick={() => sendAsk(q)}>{q}</Button>)}
                  </div>
                )}
                <MessageList messages={askMsgs} lang={lang} showEn={showEn} busy={busy} clinic={me.clinic} ttsServer={meta.tts} />
                <div className="sticky bottom-24 rounded-3xl bg-bg/95 py-2 backdrop-blur"><Composer lang={lang} onSend={(t) => t && sendAsk(t)} disabled={busy} /></div>
              </div>
            )}
            <div className="mt-12 flex justify-center">
              <button type="button" onClick={erase} className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-danger"><Trash2 size={14} /> {tr(lang, "eraseData")}</button>
            </div>
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Sections">
            <div className="mx-auto flex max-w-2xl">
              {tabs.map(({ id, label, Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id}
                  className={cx("flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-center text-[12px] leading-tight", tab === id ? "text-accent-text" : "text-muted")}>
                  <Icon size={22} />{label}
                </button>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center p-6">{children}</div>;
}

function TalkTab({ me, msgs, busy, showEn, onSend, meta }: { me: PatientView; msgs: Message[]; busy: boolean; showEn: boolean; onSend: (t: string, c?: string) => void; meta: Meta }) {
  const lang = me.language;
  const inIntake = me.stage === "intake";
  return (
    <div className="flex flex-col gap-5">
      <MessageList messages={msgs} lang={lang} showEn={showEn} busy={busy} clinic={me.clinic} ttsServer={meta.tts} />
      {inIntake ? (
        <div className="sticky bottom-24 rounded-3xl bg-bg/95 py-2 backdrop-blur">
          <Composer lang={lang} onSend={onSend} options={me.intake?.options || []} disabled={busy || !me.intake?.started} />
        </div>
      ) : (
        <Card className="rise">
          <p className="eyebrow mb-1">{tr(lang, "yourDay")}</p>
          <PatientDayMap activities={me.activities} lang={lang} labels={me.local_labels as Record<string, string>} />
          {me.stage === "review" && <p className="mt-3 rounded-2xl bg-warn-bg px-4 py-3 text-[15px] text-warn">{tr(lang, "waitingDoctor", { doctor: me.clinic.surgeon })}</p>}
        </Card>
      )}
    </div>
  );
}

function LensTab({ me, meta }: { me: PatientView; meta: Meta }) {
  const lang = me.language;
  const plan = me.plan;
  const [view, setView] = useState<string | null>(plan?.lens?.key || null);
  const shown: LensOption | null | undefined = plan?.compare.find((o) => o.key === view) || plan?.lens;
  const nearCm = useMemo(() => Math.min(40, ...((plan?.activities || me.activities).filter((a) => a.distance_cm < 100).map((a) => a.distance_cm))), [plan, me.activities]);

  if (!plan || !plan.lens) {
    return (
      <div className="flex flex-col gap-5">
        <Card><p className="text-[17px] leading-relaxed">{tr(lang, "noPlan")}</p></Card>
        {me.activities.length > 0 && <Card><p className="eyebrow mb-1">{tr(lang, "yourDay")}</p><PatientDayMap activities={me.activities} lang={lang} labels={me.local_labels as Record<string, string>} /></Card>}
        <Card>
          <h3 className="mb-3 text-[19px] font-semibold">{tr(lang, "seeIt")}</h3>
          <Simulator looks={Object.entries(meta.curves).map(([k, c]) => ({ key: k, name: c.name, curve: c.curve, halo: c.halo }))} lang={lang} nearCm={nearCm} />
        </Card>
      </div>
    );
  }
  const lens = plan.lens;
  const share = () => {
    const lines = [
      `DrishtiSaathi · ${me.name}`,
      `${tr(lang, "yourLens")}: ${planName(lens.key, lang, lens.name)} (${tr(lang, "approvedBy", { doctor: me.clinic.surgeon })})`,
      plan.note ? `${tr(lang, "doctorNote")}: ${plan.note}` : "",
      me.recovery?.surgery_date ? tr(lang, "surgeryOn", { d: me.recovery.surgery_date }) : "",
      me.recovery?.follow_ups.length ? `${tr(lang, "checkups")}: ${me.recovery.follow_ups.map((f) => f.date).join(", ")}` : "",
      `${me.clinic.name} · ${me.clinic.phone}`,
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  };
  return (
    <div className="flex flex-col gap-5">
      <Card className="rise">
        <p className="eyebrow">{tr(lang, "yourLens")}</p>
        <h2 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.03em]">{planName(lens.key, lang, lens.name)}</h2>
        <p className="mt-1 text-[15px] text-ok">✓ {tr(lang, "approvedBy", { doctor: me.clinic.surgeon })}</p>
        <EyesLine lens={lens} lang={lang} />
        {plan.note && <blockquote className="mt-4 rounded-2xl border-l-4 border-accent bg-surface-2 px-4 py-3 text-[16px]"><span className="eyebrow block">{tr(lang, "doctorNote")}</span>{plan.note}</blockquote>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[19px] font-semibold">{tr(lang, "dayWithLens")}</h3>
        </div>
        {plan.compare.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={tr(lang, "compare")}>
            {plan.compare.map((o) => (
              <button key={o.key} type="button" role="tab" aria-selected={shown?.key === o.key} onClick={() => setView(o.key)}
                className={cx("min-h-10 rounded-full border px-3.5 text-[14px]", shown?.key === o.key ? "border-accent bg-accent text-on-accent" : "border-line")}>
                {planName(o.key, lang, o.name)}{o.key === lens.key ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}
        {shown && <p className="mt-3 text-[16px] font-medium text-sky">{tr(lang, "hoursClear", { a: shown.hours_clear, b: shown.hours_total })}</p>}
        <PatientDayMap activities={plan.activities} option={shown} lang={lang} labels={me.local_labels as Record<string, string>} />
      </Card>

      <Card>
        <h3 className="mb-3 text-[19px] font-semibold">{tr(lang, "seeIt")}</h3>
        <Simulator looks={plan.compare.map((o) => ({ key: o.key, name: planName(o.key, lang, o.name), curve: o.binocular_curve, halo: o.halo }))} initial={shown?.key} lang={lang} nearCm={nearCm} />
      </Card>

      <Button variant="soft" size="lg" onClick={share}><Share2 size={18} /> {tr(lang, "share")}</Button>
    </div>
  );
}

function RecoveryTab({ me, code, onChange, onCheckin }: { me: PatientView; code: string; onChange: (r: Recovery) => void; onCheckin: (m: Message[]) => void }) {
  const lang = me.language;
  const r = me.recovery!;
  const [pain, setPain] = useState<number | null>(null);
  const [vision, setVision] = useState<string | null>(null);
  const [red, setRed] = useState<string | null>(null);
  const [result, setResult] = useState<Message | null>(null);
  const mark = async (id: number, taken: boolean) => onChange(await api<Recovery>(`/p/${code}/doses/${id}`, { method: "POST", json: { taken } }));
  const sendCheckin = async () => {
    const res = await api<{ messages: Message[] }>(`/p/${code}/checkin`, { method: "POST", json: { pain, vision, redness: red } });
    setResult(res.messages[res.messages.length - 1]); onCheckin(res.messages);
  };
  const fmt = (iso: string) => iso.slice(11, 16);
  const Choice = ({ value, set, opts }: { value: string | number | null; set: (v: never) => void; opts: [string | number, string][] }) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {opts.map(([v, l]) => (
        <button key={String(v)} type="button" onClick={() => set(v as never)} aria-pressed={value === v}
          className={cx("min-h-12 rounded-2xl border px-2 text-[15px] font-medium", value === v ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-2")}>{l}</button>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">{me.clinic.surgeon} · {me.clinic.name}</p>
        <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.03em]">{r.day !== null && r.day >= 0 ? tr(lang, "dayN", { n: r.day }) : tr(lang, "surgeryOn", { d: r.surgery_date || "" })}</h2>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[19px] font-semibold"><Droplet size={20} className="text-sky" /> {tr(lang, "todaysDrops")}</h3>
          {r.adherence.pct !== null && <Badge tone={r.adherence.pct >= 90 ? "ok" : "warn"}>{tr(lang, "dosesTaken")}: {r.adherence.taken}/{r.adherence.due_so_far}</Badge>}
        </div>
        {r.today.length === 0 ? <p className="text-muted">{tr(lang, "noDropsToday")}</p> : (
          <ul className="flex flex-col gap-2">
            {r.today.map((d) => (
              <li key={d.id} className={cx("flex items-center gap-3 rounded-2xl border px-3 py-2.5", d.status === "due" ? "border-accent" : d.status === "missed" ? "border-danger/50" : "border-line")}>
                <b className="w-14 font-mono text-[17px] font-medium">{fmt(d.due_at)}</b>
                <span className="min-w-0 flex-1 text-[16px]">{d.drug}</span>
                {d.status === "taken" ? (
                  <button type="button" onClick={() => mark(d.id, false)} className="rounded-full bg-ok-bg px-3 py-2 text-[14px] font-medium text-ok">✓ {tr(lang, "taken")}</button>
                ) : (
                  <Button size="sm" variant={d.status === "upcoming" ? "soft" : "primary"} onClick={() => mark(d.id, true)}>
                    {d.status === "missed" ? `${tr(lang, "missed")} · ` : ""}{tr(lang, "markTaken")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 text-[19px] font-semibold">{tr(lang, "checkinTitle")}</h3>
        <div className="flex flex-col gap-4">
          <div><p className="mb-2 text-[15px] text-muted">{tr(lang, "pain")}</p><Choice value={pain} set={setPain} opts={[[0, tr(lang, "p0")], [1, tr(lang, "p1")], [2, tr(lang, "p2")], [3, tr(lang, "p3")]]} /></div>
          <div><p className="mb-2 text-[15px] text-muted">{tr(lang, "vision")}</p><Choice value={vision} set={setVision} opts={[["better", tr(lang, "better")], ["same", tr(lang, "same")], ["worse", tr(lang, "worse")]]} /></div>
          <div><p className="mb-2 text-[15px] text-muted">{tr(lang, "redness")}</p><Choice value={red} set={setRed} opts={[["none", tr(lang, "rNone")], ["same", tr(lang, "rSame")], ["more", tr(lang, "rMore")]]} /></div>
          <Button size="lg" disabled={pain === null || !vision || !red} onClick={sendCheckin}>{tr(lang, "sendCheckin")}</Button>
          {result && <MessageList messages={[result]} lang={lang} showEn={false} clinic={me.clinic} />}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-[19px] font-semibold"><CalendarCheck size={20} className="text-accent-text" /> {tr(lang, "checkups")}</h3>
        <ul className="flex flex-col gap-2">
          {r.follow_ups.map((f) => (
            <li key={f.day} className={cx("flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3", f.past && "opacity-55")}>
              <span className="text-[15px]">{f.label}</span><b className="font-mono text-[15px] font-medium">{f.date}</b>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EyesLine({ lens, lang }: { lens: LensOption; lang: Lang }) {
  const eye = (k: "right" | "left") => {
    const e = lens.eyes?.[k];
    if (!e) return null;
    const how = e.fixed ? tr(lang, "alreadyDone") : e.target < -0.4 ? tr(lang, "forNear") : tr(lang, "forDistance");
    return (
      <li className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
        <span className="w-24 shrink-0 text-[14px] text-muted">{tr(lang, k === "right" ? "rightEye" : "leftEye")}</span>
        <span className="text-[15px]"><b className="font-semibold">{e.name.replace(" (already implanted)", "")}</b> · {how}</span>
      </li>
    );
  };
  return (
    <div className="mt-4 flex flex-col gap-2">
      <ul className="flex flex-col gap-2">{eye("right")}{eye("left")}</ul>
      {lens.strategy === "blended" && <p className="rounded-2xl bg-sky-bg px-4 py-3 text-[15px] leading-relaxed text-sky">{tr(lang, "blendedExplain")}</p>}
    </div>
  );
}
