"use client";

import { CalendarCheck, ChevronDown, Droplet, Eye, HeartPulse, Languages, MessageCircleQuestion, MessagesSquare, Share2, Trash2, Volume2, VolumeX, ScanEye } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer, MessageList } from "@/components/Chat";
import { item, spring, stagger } from "@/components/motion";
import { PatientDayMap } from "@/components/DayMap";
import SeeIt from "@/components/SeeIt";
import VisionTest from "@/components/VisionTest";
import { ListenButton, ReadingButton, useReading } from "@/components/Readability";
import { Badge, Button, Card, Logo, Spinner, cx } from "@/components/ui";
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
  const reading = useReading();
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

  if (err === "notfound") return <Center><Card className="max-w-md text-center"><p className="text-[1.0625rem]">{tr("en", "notFoundCode")}</p><Button className="mt-4" onClick={() => router.push("/")}>Back</Button></Card></Center>;
  if (err) return <Center><p className="text-danger">{err}</p></Center>;
  if (!me || !meta) return <Center><Spinner /></Center>;

  const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "talk", label: tr(lang, "tabTalk"), Icon: MessagesSquare },
    { id: "lens", label: tr(lang, "tabLens"), Icon: ScanEye },
    ...(me.recovery ? [{ id: "recovery" as Tab, label: tr(lang, "tabRecovery"), Icon: HeartPulse }] : []),
    { id: "test", label: tr(lang, "tabTest"), Icon: Eye },
    { id: "ask", label: tr(lang, "tabAsk"), Icon: MessageCircleQuestion },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col overflow-x-clip" lang={lang}>
      <header className={cx("glass-strong sticky top-0 z-30 flex items-center gap-2 border-x-0 border-t-0 px-4 py-3", reading.size > 0 && "flex-wrap")}>
        <Logo size={24} />
        <div className={cx("ml-auto flex items-center justify-end gap-1.5", reading.size > 0 && "flex-wrap")}>
          <label className="glass relative inline-flex h-10 items-center gap-1.5 rounded-full pl-3 pr-2 text-[0.875rem] font-medium">
            <Languages size={16} className="text-muted" />
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="appearance-none bg-transparent pr-1 focus:outline-none" aria-label="Language">
              {(Object.keys(LANG_NAMES) as Lang[]).map((l) => <option key={l} value={l} className="bg-[#10141c] text-white">{LANG_NAMES[l]}</option>)}
            </select>
          </label>
          {lang !== "en" && (
            <button type="button" onClick={() => setShowEn(!showEn)} aria-pressed={showEn} title={tr(lang, "showEnglish")}
              className={cx("h-10 rounded-full px-3 text-[0.75rem] font-bold transition", showEn ? "btn-primary" : "glass text-muted")}>EN</button>
          )}
          <button type="button" onClick={() => { setAutoSpeak(!autoSpeak); stopSpeaking(); }} aria-pressed={autoSpeak} aria-label={tr(lang, "readAloud")}
            className={cx("grid h-10 w-10 place-items-center rounded-full transition", autoSpeak ? "btn-primary" : "glass text-muted")}>
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <ReadingButton lang={lang} reading={reading} />
        </div>
      </header>

      {!me.consented ? (
        <motion.main variants={stagger} initial="hidden" animate="show" className="relative flex flex-1 flex-col justify-center gap-6 overflow-hidden px-5 py-10">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-2 h-52 w-52">
            <div className="sphere sphere-blue float absolute right-4 top-0 h-32 w-32" />
            <div className="sphere sphere-red float absolute right-36 top-6 h-11 w-11" style={{ animationDelay: "-2s" }} />
            <div className="sphere sphere-yellow float absolute right-10 top-36 h-8 w-8" style={{ animationDelay: "-4s" }} />
          </div>
          <motion.div variants={item} className="relative mt-24 self-start">
            <div className="bubble bubble-light bubble-l text-[1rem]">{tr(lang, "consentTitle")}, {me.name.split(" ")[0]} 👋</div>
          </motion.div>
          <motion.h1 variants={item} className="display relative mt-4 text-[2.75rem]">DrishtiSaathi<br /><span className="text-muted">{tr(lang, "tagline")}</span></motion.h1>
          <motion.div variants={item}><Card className="relative flex items-start gap-3 text-[1.0625rem] leading-relaxed text-muted"><span className="flex-1">{tr(lang, "consentBody")}</span><ListenButton text={tr(lang, "consentBody")} lang={lang} tts={!!meta.tts} /></Card></motion.div>
          <motion.p variants={item} className="text-[0.875rem] text-muted">{me.clinic.name} · {me.clinic.surgeon}</motion.p>
          <motion.div variants={item}><Button size="lg" arrow className="w-full" onClick={consent}>{tr(lang, "consentAgree")}</Button></motion.div>
        </motion.main>
      ) : (
        <>
          <main className="flex-1 px-4 pb-36 pt-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
                {tab === "talk" && <TalkTab me={me} msgs={intakeMsgs} busy={busy} showEn={showEn} onSend={sendIntake} meta={meta} />}
                {tab === "lens" && <LensTab me={me} meta={meta} />}
                {tab === "recovery" && me.recovery && <RecoveryTab me={me} code={code} tts={!!meta.tts} onChange={(r) => setMe({ ...me, recovery: r })} onCheckin={(m) => { setAskMsgs((x) => [...x, ...m]); say(m); }} />}
                {tab === "test" && (
                  // The eye test sizes letters in pixels from a card calibration; the text-size option does not change them.
                  <div><VisionTest code={code} lang={lang} clinic={me.clinic} operatedEye={me.stage === "post_op" ? me.eye : null} onSafety={(m) => { setAskMsgs((x) => [...x, ...m]); say(m); }} /></div>
                )}
                {tab === "ask" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="display text-[1.875rem]">{tr(lang, "askTitle")}</h2>
                      <p className="mt-2 text-[0.875rem] text-muted">{tr(lang, "askHint")}</p>
                    </div>
                    {askMsgs.length === 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tr(lang, "askExamples").split("|").map((q, i) => (
                          <motion.button key={q} type="button" onClick={() => sendAsk(q)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.06 }}
                            whileTap={{ scale: 0.96 }} className="bubble bubble-light bubble-l text-[0.9375rem]">{q}</motion.button>
                        ))}
                      </div>
                    )}
                    <MessageList messages={askMsgs} lang={lang} showEn={showEn} busy={busy} clinic={me.clinic} ttsServer={meta.tts} />
                    <div className="sticky bottom-[104px]"><Composer lang={lang} onSend={(t) => t && sendAsk(t)} disabled={busy} /></div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="mt-12 flex justify-center">
              <button type="button" onClick={erase} className="inline-flex items-center gap-2 text-[0.8125rem] text-muted transition hover:text-danger"><Trash2 size={14} /> {tr(lang, "eraseData")}</button>
            </div>
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))]" aria-label="Sections">
            <div className="dock mx-auto flex max-w-xl rounded-[24px] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,.85)]">
              {tabs.map(({ id, label, Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id}
                  className={cx("relative flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 text-center text-[0.7188rem] font-semibold leading-tight transition-colors", tab === id ? "text-white" : "text-muted hover:text-ink")}>
                  {tab === id && <motion.span layoutId="tab-pill" className="btn-primary absolute inset-0 rounded-[18px]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <Icon size={21} className="relative" />
                  <span className="relative max-w-full truncate">{label}</span>
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
        <div className="sticky bottom-[104px]">
          <Composer lang={lang} onSend={onSend} options={me.intake?.options || []} disabled={busy || !me.intake?.started} />
        </div>
      ) : (
        <Card className="rise">
          <p className="eyebrow mb-1">{tr(lang, "yourDay")}</p>
          <PatientDayMap activities={me.activities} lang={lang} labels={me.local_labels as Record<string, string>} />
          {me.stage === "review" && <p className="mt-3 rounded-2xl bg-warn-bg px-4 py-3 text-[0.9375rem] text-warn">{tr(lang, "waitingDoctor", { doctor: me.clinic.surgeon })}</p>}
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
        <Card><p className="text-[1.0625rem] leading-relaxed">{tr(lang, "noPlan")}</p></Card>
        {me.activities.length > 0 && <Card><p className="eyebrow mb-1">{tr(lang, "yourDay")}</p><PatientDayMap activities={me.activities} lang={lang} labels={me.local_labels as Record<string, string>} /></Card>}
        <Card>
          <h3 className="mb-3 text-[1.1875rem] font-semibold">{tr(lang, "seeIt")}</h3>
          <SeeIt looks={Object.entries(meta.curves).map(([k, c]) => ({ key: k, name: c.name, curve: c.curve, halo: c.halo }))} lang={lang} nearCm={nearCm} />
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
      <div className="stat-accent rise rounded-[26px] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[0.875rem] font-medium text-white/80">{tr(lang, "yourLens")}</p>
          <ListenButton lang={lang} tts={!!meta.tts} className="-mr-1 -mt-1 !h-9 !w-9 !border-white/25 !bg-white/15 !text-white"
            text={[`${tr(lang, "yourLens")}: ${planName(lens.key, lang, lens.name)}.`, `${tr(lang, "approvedBy", { doctor: me.clinic.surgeon })}.`, plan.note ? `${tr(lang, "doctorNote")}: ${plan.note}` : ""].filter(Boolean).join(" ")} />
        </div>
        <h2 className="mt-1 text-[1.875rem] font-semibold leading-tight tracking-[-0.03em]">{planName(lens.key, lang, lens.name)}</h2>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.875rem]">✓ {tr(lang, "approvedBy", { doctor: me.clinic.surgeon })}</p>
      </div>

      <Card>
        <EyesLine lens={lens} lang={lang} />
        {plan.note && <blockquote className="mt-4 rounded-2xl border-l-4 border-accent bg-surface-2 px-4 py-3 text-[1rem]"><span className="eyebrow block">{tr(lang, "doctorNote")}</span>{plan.note}</blockquote>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[1.1875rem] font-semibold">{tr(lang, "dayWithLens")}</h3>
        </div>
        {shown && (
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-accent-text">{shown.hours_clear}</span>
            <span className="text-[0.9375rem] text-muted">/ {shown.hours_total} h</span>
          </p>
        )}
        {shown && <p className="mt-1 text-[0.9375rem] text-muted">{tr(lang, "hoursClear", { a: shown.hours_clear, b: shown.hours_total })}</p>}
        {plan.compare.length > 1 && (
          <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label={tr(lang, "compare")}>
            {plan.compare.map((o) => (
              <button key={o.key} type="button" role="tab" aria-selected={shown?.key === o.key} onClick={() => setView(o.key)}
                className={cx("min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[0.875rem]", shown?.key === o.key ? "border-accent bg-accent text-on-accent" : "border-line")}>
                {planName(o.key, lang, o.name)}{o.key === lens.key ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}
        <PatientDayMap activities={plan.activities} option={shown} lang={lang} labels={me.local_labels as Record<string, string>} />
      </Card>

      <Card>
        <h3 className="mb-3 text-[1.1875rem] font-semibold">{tr(lang, "seeIt")}</h3>
        <SeeIt looks={plan.compare.map((o) => ({ key: o.key, name: planName(o.key, lang, o.name), curve: o.binocular_curve, halo: o.halo }))} initial={shown?.key} lang={lang} nearCm={nearCm} />
      </Card>

      <Button variant="soft" size="lg" onClick={share}><Share2 size={18} /> {tr(lang, "share")}</Button>
    </div>
  );
}

function RecoveryTab({ me, code, tts, onChange, onCheckin }: { me: PatientView; code: string; tts: boolean; onChange: (r: Recovery) => void; onCheckin: (m: Message[]) => void }) {
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
          className={cx("min-h-12 rounded-2xl border px-2 text-[0.9375rem] font-medium", value === v ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-2")}>{l}</button>
      ))}
    </div>
  );
  // The one thing to do now: the first due or missed dose, else the next upcoming one.
  const next = r.today.find((d) => d.status === "due") || r.today.find((d) => d.status === "missed") || r.today.find((d) => d.status === "upcoming");
  const done = r.today.filter((d) => d.status === "taken").length;
  const upcomingCheck = r.follow_ups.find((f) => !f.past);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[0.9375rem] text-muted">{tr(lang, "hello", { name: me.name.split(" ")[0] })}</p>
        <h2 className="mt-0.5 text-[1.875rem] font-semibold leading-tight tracking-[-0.03em]">{r.day !== null && r.day >= 0 ? tr(lang, "dayN", { n: r.day }) : tr(lang, "surgeryOn", { d: r.surgery_date || "" })}</h2>
      </div>

      {r.today.length > 0 && (
        <div className="grid grid-cols-[1.6fr_1fr] gap-3">
          {/* Next drop: the single action that matters now. */}
          <div className="stat-accent flex flex-col gap-3 rounded-[24px] p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-white/85"><Droplet size={16} /> {next ? tr(lang, "nextDrop") : tr(lang, "todaysDrops")}</span>
              <ListenButton lang={lang} tts={tts} className="!h-9 !w-9 !border-white/25 !bg-white/15 !text-white"
                text={next ? `${tr(lang, "nextDrop")}: ${fmt(next.due_at)}, ${next.drug}.` : tr(lang, "allDropsDone")} />
            </div>
            {next ? (
              <>
                <div>
                  <p className="font-mono text-[2.25rem] font-medium leading-none">{fmt(next.due_at)}</p>
                  <p className="mt-1.5 text-[1rem] leading-snug text-white/90">{next.drug}</p>
                </div>
                <button type="button" onClick={() => mark(next.id, true)}
                  className="mt-auto min-h-12 rounded-full bg-white px-4 text-[1rem] font-semibold text-[#1f3bd8] transition active:scale-[.97]">
                  {next.status === "missed" ? `${tr(lang, "missed")} · ` : ""}{tr(lang, "markTaken")}
                </button>
              </>
            ) : <p className="mt-auto text-[1.125rem] font-semibold leading-snug">✓ {tr(lang, "allDropsDone")}</p>}
          </div>
          <div className="card-solid flex flex-col justify-between gap-3 rounded-[24px] p-4">
            <span className="text-[0.875rem] font-medium text-muted">{tr(lang, "todaysDrops")}</span>
            <div>
              <p className="text-[2.25rem] font-semibold leading-none tracking-[-0.03em]">{done}<span className="text-[1rem] font-medium text-muted"> / {r.today.length}</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ok transition-all" style={{ width: `${(done / r.today.length) * 100}%` }} /></div>
              <p className="mt-2 text-[0.8125rem] text-muted">{tr(lang, "dosesDone", { a: done, b: r.today.length })}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="!p-2">
        {r.today.length === 0 ? <p className="px-3 py-3 text-muted">{tr(lang, "noDropsToday")}</p> : (
          <details className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-3 text-[1rem] font-medium">
              <CalendarCheck size={19} className="text-accent-text" /> {tr(lang, "seeSchedule")}
              <ChevronDown size={18} className="ml-auto text-muted transition group-open:rotate-180" />
            </summary>
            <ul className="flex flex-col gap-2 px-1 pb-1 pt-2">
              {r.today.map((d) => (
                <li key={d.id} className={cx("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-3 py-2.5", d.status === "due" ? "border-accent" : d.status === "missed" ? "border-danger/50" : "border-line")}>
                  <b className="w-14 font-mono text-[1.0625rem] font-medium">{fmt(d.due_at)}</b>
                  <span className="min-w-[7rem] flex-1 text-[1rem]">{d.drug}</span>
                  {d.status === "taken" ? (
                    <button type="button" onClick={() => mark(d.id, false)} className="ml-auto rounded-full bg-ok-bg px-3 py-2 text-[0.875rem] font-medium text-ok">✓ {tr(lang, "taken")}</button>
                  ) : (
                    <Button size="sm" className="ml-auto" variant={d.status === "upcoming" ? "soft" : "primary"} onClick={() => mark(d.id, true)}>
                      {d.status === "missed" ? `${tr(lang, "missed")} · ` : ""}{tr(lang, "markTaken")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 text-[1.1875rem] font-semibold">{tr(lang, "checkinTitle")}</h3>
        <div className="flex flex-col gap-4">
          <div><p className="mb-2 text-[0.9375rem] text-muted">{tr(lang, "pain")}</p><Choice value={pain} set={setPain} opts={[[0, tr(lang, "p0")], [1, tr(lang, "p1")], [2, tr(lang, "p2")], [3, tr(lang, "p3")]]} /></div>
          <div><p className="mb-2 text-[0.9375rem] text-muted">{tr(lang, "vision")}</p><Choice value={vision} set={setVision} opts={[["better", tr(lang, "better")], ["same", tr(lang, "same")], ["worse", tr(lang, "worse")]]} /></div>
          <div><p className="mb-2 text-[0.9375rem] text-muted">{tr(lang, "redness")}</p><Choice value={red} set={setRed} opts={[["none", tr(lang, "rNone")], ["same", tr(lang, "rSame")], ["more", tr(lang, "rMore")]]} /></div>
          <Button size="lg" disabled={pain === null || !vision || !red} onClick={sendCheckin}>{tr(lang, "sendCheckin")}</Button>
          {result && <MessageList messages={[result]} lang={lang} showEn={false} clinic={me.clinic} />}
        </div>
      </Card>

      {r.follow_ups.length > 0 && (
        <Card className="!p-2">
          {upcomingCheck && (
            <div className="flex items-center gap-3 px-3 py-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-accent-text"><CalendarCheck size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] text-muted">{tr(lang, "nextCheckup")}</p>
                <p className="truncate text-[1rem] font-medium">{upcomingCheck.label}</p>
              </div>
              <b className="font-mono text-[1rem] font-medium">{upcomingCheck.date}</b>
            </div>
          )}
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 text-[0.9375rem] text-muted">
              {tr(lang, "allCheckups")} <ChevronDown size={17} className="ml-auto transition group-open:rotate-180" />
            </summary>
            <ul className="flex flex-col gap-2 px-1 pb-1 pt-1">
              {r.follow_ups.map((f) => (
                <li key={f.day} className={cx("flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3", f.past && "opacity-55")}>
                  <span className="text-[0.9375rem]">{f.label}</span><b className="font-mono text-[0.9375rem] font-medium">{f.date}</b>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
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
        <span className="w-24 shrink-0 text-[0.875rem] text-muted">{tr(lang, k === "right" ? "rightEye" : "leftEye")}</span>
        <span className="text-[0.9375rem]"><b className="font-semibold">{e.name.replace(" (already implanted)", "")}</b> · {how}</span>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">{eye("right")}{eye("left")}</ul>
      {lens.strategy === "blended" && <p className="rounded-2xl bg-sky-bg px-4 py-3 text-[0.9375rem] leading-relaxed text-sky">{tr(lang, "blendedExplain")}</p>}
    </div>
  );
}
