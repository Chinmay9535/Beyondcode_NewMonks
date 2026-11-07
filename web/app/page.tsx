"use client";

import { Camera, CircleGauge, HeartPulse, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Reveal, item, softSpring, spring, stagger } from "@/components/motion";
import { ArrowDot, Badge, Button, Logo, Tag, ThemeToggle, cx } from "@/components/ui";
import { api, type Meta } from "@/lib/api";

const LensScene = dynamic(() => import("@/components/three/LensScene"), { ssr: false, loading: () => <SceneFallback /> });

const DEMOS = [
  { code: "RAMESH", name: "Ramesh", meta: "Tailor · Mysuru", lang: "ಕನ್ನಡ", what: "Start the conversation" },
  { code: "KAMALA", name: "Kamala", meta: "Homemaker · Mandya", lang: "ಕನ್ನಡ", what: "Blended vision plan", staff: true },
  { code: "LAKSHMI", name: "Lakshmi", meta: "Retired · Chennai", lang: "தமிழ்", what: "Waiting for review" },
  { code: "ABDUL", name: "Abdul", meta: "Auto driver · Bengaluru", lang: "हिन्दी", what: "Day 3 after surgery" },
];

// Three bubbles that tell the story (talk, answer, outcome), each in a fixed empty zone of the scene.
const BUBBLES = [
  { text: "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ದಿನದ ಬಗ್ಗೆ ಹೇಳಿ.", lang: "kn", tone: "light", pos: "left-[4%] top-[0%]", tail: "l" },
  { text: "मैं दिन भर ऑटो चलाता हूँ", lang: "hi", tone: "blue", pos: "right-[2%] top-[10%]", tail: "r" },
  { text: "Approved by your doctor ✓", lang: "en", tone: "light", pos: "right-[10%] bottom-[8%]", tail: "r" },
] as const;

const STEPS = [
  { Icon: MessageCircle, title: "Talk", text: "Voice-first, in the language you think in." },
  { Icon: CircleGauge, title: "Match", text: "Your day, hour by hour, against every lens." },
  { Icon: Camera, title: "See", text: "Your own world through each lens, before surgery." },
  { Icon: HeartPulse, title: "Recover", text: "Drops, checks and warning signs, straight to your doctor." },
];

const STATS = [
  { value: "97%", label: "Emergencies recognised on a held-out test set", dot: "bg-white" },
  { value: "4", label: "Languages, plus romanised and mixed typing", dot: "bg-yellow3d" },
  { value: "0", label: "Photos leave the phone. Depth runs on-device", dot: "bg-red3d" },
];

function SceneFallback() {
  return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/3d/street-cataract.jpg)" }} />;
}

export default function Home() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [code, setCode] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => { api<Meta>("/meta").then(setMeta).catch(() => setDown(true)); }, []);
  const go = (c: string) => c.trim() && router.push(`/p/${c.trim().toUpperCase()}`);

  return (
    <div className="relative overflow-x-clip">
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-bg/85 to-bg/0 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-4">
          <Logo />
          <nav className="glass ml-2 hidden items-center gap-1 rounded-xl p-1 md:flex">
            {[["How it works", "#how"], ["For surgeons", "#surgeons"], ["Safety", "/safety"]].map(([l, h]) => (
              <a key={l} href={h} className="rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">{l}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {meta && <Badge tone={meta.ai === "offline" ? "neutral" : "sky"} className="hidden sm:inline-flex">AI · {meta.ai}</Badge>}
            <ThemeToggle />
            <Link href="/staff" className="hidden items-center gap-2.5 rounded-full border border-line-strong py-1.5 pl-4 pr-1.5 text-[14px] font-semibold transition hover:bg-surface-2 sm:inline-flex">
              Clinic login <ArrowDot />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      {/* Full-bleed street at dusk: blurred as a cataract patient sees it, sharp through the glasses. */}
      <section className="relative -mt-[76px] overflow-hidden pt-[76px]">
        <LensScene className="absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,12,.94)_0%,rgba(6,8,12,.78)_42%,rgba(6,8,12,.1)_70%)] lg:bg-[linear-gradient(90deg,rgba(6,8,12,.96)_0%,rgba(6,8,12,.82)_30%,rgba(6,8,12,.2)_56%,rgba(6,8,12,0)_72%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#06080c] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#06080c] to-transparent" />
        <div className="relative mx-auto grid min-h-[calc(100dvh-76px)] max-w-[1240px] items-start gap-6 px-5 pb-[46vh] lg:grid-cols-[1.02fr_1fr] lg:items-center lg:pb-0">
        <motion.div variants={stagger} initial={reduce ? false : "hidden"} animate="show" className="relative z-10 flex flex-col gap-7 pt-6 lg:pt-0">
          <motion.div variants={item}><Tag>Cataract care · India</Tag></motion.div>
          <motion.h1 variants={item} className="display text-[clamp(46px,6.4vw,88px)]">
            See your lens<br /><span className="text-muted">before you choose it.</span>
          </motion.h1>
          <motion.p variants={item} className="max-w-[44ch] text-[17px] leading-relaxed text-muted">
            A voice companion in Kannada, Hindi, Tamil and English. It learns your day, shows you every lens, and stays with you through recovery.
          </motion.p>
          <motion.form variants={item} onSubmit={(e) => { e.preventDefault(); go(code); }} className="flex w-full max-w-[520px] items-center gap-2">
            <label className="glass flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl pl-2.5 pr-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-[11px] font-bold text-accent-text">ID</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter your clinic code" aria-label="Clinic code"
                className="min-w-0 flex-1 bg-transparent text-[16px] uppercase tracking-[.06em] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:outline-none" />
            </label>
            <Button type="submit" size="lg" arrow>Start</Button>
          </motion.form>
          <motion.div variants={item} className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>Try a demo:</span>
            {DEMOS.filter((d) => !d.staff).map((d) => (
              <Link key={d.code} href={`/p/${d.code}`} className="rounded-full border border-line px-3 py-1 font-medium text-ink transition hover:border-accent hover:text-accent-text">{d.name} · {d.lang}</Link>
            ))}
          </motion.div>
          {down && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-[14px] text-danger">The API is not reachable. Start the backend on port 8000.</p>}
        </motion.div>

          <div className="relative hidden h-[640px] lg:block">
            {BUBBLES.map((b, i) => (
              <motion.div key={b.text} lang={b.lang} className={cx("pointer-events-none absolute z-10", b.pos)}
                initial={reduce ? false : { opacity: 0, scale: 0.6, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ ...spring, delay: 0.9 + i * 0.3 }}>
                <div className="float" style={{ animationDelay: `${-i * 2}s`, animationDuration: "7s" }}>
                  <div className={cx("bubble text-[14.5px]", b.tone === "blue" ? "bubble-blue" : "bubble-light", b.tail === "l" ? "bubble-l" : "bubble-r")}>{b.text}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- demo strip */}
      <section className="mx-auto max-w-[1240px] px-5">
        <Reveal>
          <div className="panel hairline grid items-center gap-6 rounded-[28px] p-6 md:grid-cols-[0.8fr_2fr] md:p-8">
            <div>
              <p className="display text-[clamp(34px,4vw,52px)]">“In my language.”</p>
              <p className="mt-2 text-[14px] text-muted">Four demo patients, four journeys.</p>
            </div>
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {DEMOS.map((d) => (
                <motion.div key={d.code} variants={item} whileHover={{ y: -4 }} transition={spring} className="min-w-[200px] flex-1">
                  <Link href={d.staff ? `/staff/${d.code}` : `/p/${d.code}`} className="glass flex h-full flex-col gap-3 rounded-2xl p-4 transition hover:border-line-strong">
                    <span className="flex items-center justify-between"><b className="text-[17px] font-semibold">{d.name}</b><span className="text-[13px] text-muted">{d.lang}</span></span>
                    <span className="text-[13px] text-muted">{d.meta}</span>
                    <span className="mt-auto flex items-center justify-between text-[13.5px] font-medium text-accent-text">{d.what}<ArrowDot tone="blue" size={22} /></span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- how it works */}
      <section id="how" className="mx-auto max-w-[1240px] px-5 py-28">
        <Reveal className="max-w-2xl">
          <Tag>How it works</Tag>
          <h2 className="display mt-5 text-[clamp(36px,4.6vw,60px)]">One companion.<br /><span className="text-muted">First question to full recovery.</span></h2>
        </Reveal>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <motion.div key={title} variants={item} whileHover={{ y: -6 }} transition={spring} className="glass hairline group relative overflow-hidden rounded-[26px] p-6">
              <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl transition group-hover:bg-accent/35" />
              <span className="relative grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-solid text-accent-text"><Icon size={22} /></span>
              <p className="relative mt-10 text-[13px] font-semibold text-muted">0{i + 1}</p>
              <h3 className="relative mt-1 text-[24px] font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="relative mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------------------------------------------------------- numbers */}
      <section className="relative mx-auto max-w-[1240px] px-5 pb-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <Tag>Measured, not promised</Tag>
            <h2 className="display mt-5 text-[clamp(36px,4.6vw,60px)]">Safety you<br /><span className="text-muted">can check.</span></h2>
            <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-muted">Every message passes a red-flag check that works without AI. We publish how often it catches an emergency.</p>
            <Link href="/safety" className="mt-7 inline-flex items-center gap-3 rounded-full py-2 pl-5 pr-2 text-[15px] font-semibold btn-primary">Open the scorecard <ArrowDot /></Link>
          </Reveal>
          <div className="relative flex flex-col gap-4 lg:pl-10">
            <div className="sphere sphere-red float pointer-events-none absolute -bottom-6 -left-4 h-24 w-24 opacity-90" />
            <div className="sphere sphere-blue float pointer-events-none absolute -right-6 -top-10 h-20 w-20" style={{ animationDelay: "-3s" }} />
            {STATS.map((s, i) => (
              <Reveal key={s.value} delay={i * 0.08}>
                <motion.div whileHover={{ x: -6 }} transition={spring} className="glass hairline relative rounded-[22px] p-6" style={{ marginLeft: `${i * 7}%` }}>
                  <span className={cx("absolute right-5 top-5 h-2 w-2 rounded-full", s.dot)} />
                  <p className="display text-[54px] leading-none">{s.value}</p>
                  <p className="mt-2 max-w-[30ch] text-[14.5px] text-muted">{s.label}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- surgeons */}
      <section id="surgeons" className="mx-auto max-w-[1240px] px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] p-8 md:p-12" style={{ background: "linear-gradient(135deg,#0d2a6b 0%,#1f5bd8 55%,#2f7bff 100%)" }}>
            <div className="sphere sphere-red float absolute right-[10%] top-[18%] h-24 w-24" />
            <div className="sphere sphere-yellow float absolute right-[24%] bottom-[14%] h-12 w-12" style={{ animationDelay: "-2s" }} />
            <div className="sphere sphere-blue float absolute -right-10 -bottom-16 h-56 w-56 opacity-80" style={{ animationDelay: "-4s" }} />
            <div className="relative max-w-xl text-white">
              <span className="tag !border-white/20 !bg-white/10 !text-white/80"><Stethoscope size={12} /> For surgeons</span>
              <h2 className="display mt-5 text-[clamp(34px,4.4vw,56px)]">A shortlist with reasons.<br /><span className="text-white/60">You approve every lens.</span></h2>
              <p className="mt-5 text-[16px] leading-relaxed text-white/75">Both-eye plans, per-eye powers, the patient’s own words, and a live alert queue.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/staff" className="inline-flex items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2 text-[15px] font-semibold text-[#1f5bd8] transition hover:bg-white/90">Open dashboard <ArrowDot tone="blue" /></Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 text-[13px] text-white/80"><ShieldCheck size={14} /> Demo PIN 2468</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 border-t border-line px-5 py-8 text-[13px] text-muted">
        <Logo size={22} />
        <span>Decision support only. Never diagnoses. Every lens choice is approved by the surgeon.</span>
        <span className="ml-auto text-[12px]">3D glasses: “SunglassesKhronos” © 2024 Darmstadt Graphics Group GmbH, <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, materials modified · Photo: Subhashish Panigrahi, <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>, adapted</span>
      </footer>
      {!reduce && <motion.div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ ...softSpring, opacity: { delay: 0.6, duration: 0.4 } }} />}
    </div>
  );
}
