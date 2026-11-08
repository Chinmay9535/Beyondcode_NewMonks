"use client";

import { Camera, CircleGauge, HeartPulse, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Reveal, item, softSpring, spring, stagger } from "@/components/motion";
import { ArrowDot, Badge, Button, Logo, Tag, ThemeToggle, cx } from "@/components/ui";
import { api, type Meta } from "@/lib/api";
import { STAGES, STORY_ID, storyProgress } from "@/lib/story";

const PillarField = dynamic(() => import("@/components/three/PillarField"), { ssr: false });

const DEMOS = [
  { code: "RAMESH", name: "Ramesh", meta: "Tailor · Mysuru", lang: "ಕನ್ನಡ", what: "Start the conversation" },
  { code: "KAMALA", name: "Kamala", meta: "Homemaker · Mandya", lang: "ಕನ್ನಡ", what: "Blended vision plan", staff: true },
  { code: "LAKSHMI", name: "Lakshmi", meta: "Retired · Chennai", lang: "தமிழ்", what: "Waiting for review" },
  { code: "ABDUL", name: "Abdul", meta: "Auto driver · Bengaluru", lang: "हिन्दी", what: "Day 3 after surgery" },
];

// The pinned story after the opening headline; the pillar field takes one shape per chapter.
const CHAPTERS = [
  { eyebrow: "Your day", title: "Every hour", rest: "of your day.", text: "Threading a needle at 33 cm, riding home at night. Each activity is matched against every lens." },
  { eyebrow: "Both eyes", title: "Two eyes,", rest: "one plan.", text: "Monofocal, EDOF, trifocal or blended vision, with per-eye powers your surgeon approves." },
  { eyebrow: "Recovery", title: "Recovery,", rest: "measured.", text: "Drops, daily check-ins and a home vision test. Warning signs reach your doctor in seconds." },
  { eyebrow: "For clinics", title: "Every patient,", rest: "one dashboard.", text: "Shortlists with reasons, per-eye powers and a live alert queue. You approve every lens.", card: true },
];

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

export default function Home() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [code, setCode] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => { api<Meta>("/meta").then(setMeta).catch(() => setDown(true)); }, []);
  // The hero is pinned while the pillar field plays its four shapes; then it steps back.
  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, (y) => storyProgress(y).p);
  const fieldOpacity = useTransform(scrollY, (y) => 1 - 0.68 * storyProgress(y).q);
  // During the final dive the field fills the screen; a soft vignette hides where the grid ends.
  const vignette = useTransform(progress, (p) => Math.min(1, Math.max(0, p - (STAGES - 2))));
  const [stage, setStage] = useState(0);
  useMotionValueEvent(progress, "change", (p) => setStage(Math.round(p)));
  const panel = (i: number) => ({
    animate: { opacity: stage === i ? 1 : 0, y: stage === i ? 0 : stage > i ? -36 : 36, filter: stage === i ? "blur(0px)" : "blur(8px)" },
    transition: { type: "spring" as const, stiffness: 170, damping: 26 },
    className: cx("[grid-area:1/1]", stage !== i && "pointer-events-none"),
    "aria-hidden": stage !== i,
  });
  const go = (c: string) => c.trim() && router.push(`/p/${c.trim().toUpperCase()}`);

  return (
    <div className="relative overflow-x-clip">
      <motion.div style={{ opacity: fieldOpacity }} className="pointer-events-none fixed inset-0 z-0">
        <PillarField className="absolute inset-0" />
        <motion.div style={{ opacity: vignette }} className="absolute inset-0 bg-[radial-gradient(75%_75%_at_50%_50%,transparent_55%,var(--bg)_100%)]" />
      </motion.div>
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-bg/85 to-bg/0 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-4">
          <Logo />
          <nav className="glass ml-2 hidden items-center gap-1 rounded-xl p-1 md:flex">
            {[["How it works", "#how"], ["For surgeons", "#surgeons"], ["Safety", "/safety"]].map(([l, h]) => (
              <a key={l} href={h} className="rounded-lg px-3.5 py-1.5 text-[0.8438rem] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">{l}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {meta && <Badge tone={meta.ai === "offline" ? "neutral" : "sky"} className="hidden sm:inline-flex">AI · {meta.ai}</Badge>}
            <ThemeToggle />
            <Link href="/staff" className="hidden items-center gap-2.5 rounded-full border border-line-strong py-1.5 pl-4 pr-1.5 text-[0.875rem] font-semibold transition hover:bg-surface-2 sm:inline-flex">
              Clinic login <ArrowDot />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero: pinned scroll story */}
      <section id={STORY_ID} className="relative z-10 -mt-[76px]" style={{ height: `${100 + (STAGES - 1) * 75}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="mx-auto grid h-full max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start px-5 pt-[96px] lg:grid-cols-[1.02fr_1fr] lg:items-center lg:pt-[76px]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
              <motion.div {...panel(0)}>
                <motion.div variants={stagger} initial={reduce ? false : "hidden"} animate="show" className="flex flex-col gap-7">
                  <motion.div variants={item}><Tag>Cataract care · India</Tag></motion.div>
                  <motion.h1 variants={item} className="display text-[clamp(46px,6.4vw,88px)]">
                    See your lens<br /><span className="text-muted">before you choose it.</span>
                  </motion.h1>
                  <motion.p variants={item} className="max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted">
                    A voice companion in Kannada, Hindi, Tamil and English. It learns your day, shows you every lens, and stays with you through recovery.
                  </motion.p>
                  <motion.form variants={item} onSubmit={(e) => { e.preventDefault(); go(code); }} className="flex w-full max-w-[520px] items-center gap-2">
                    <label className="glass flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl pl-2.5 pr-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-[0.6875rem] font-bold text-accent-text">ID</span>
                      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter your clinic code" aria-label="Clinic code" tabIndex={stage === 0 ? 0 : -1}
                        className="min-w-0 flex-1 bg-transparent text-[1rem] uppercase tracking-[.06em] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:outline-none" />
                    </label>
                    <Button type="submit" size="lg" arrow tabIndex={stage === 0 ? 0 : -1}>Start</Button>
                  </motion.form>
                  <motion.div variants={item} className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted">
                    <span>Try a demo:</span>
                    {DEMOS.filter((d) => !d.staff).map((d) => (
                      <Link key={d.code} href={`/p/${d.code}`} tabIndex={stage === 0 ? 0 : -1} className="rounded-full border border-line px-3 py-1 font-medium text-ink transition hover:border-accent hover:text-accent-text">{d.name} · {d.lang}</Link>
                    ))}
                  </motion.div>
                  {down && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-[0.875rem] text-danger">The API is not reachable. Start the backend on port 8000.</p>}
                </motion.div>
              </motion.div>
              {CHAPTERS.map((c, i) => (
                <motion.div key={c.eyebrow} {...panel(i + 1)} initial={false}>
                  {c.card ? (
                    // The dive: the field fills the screen, so this chapter sits on blue glass.
                    <div className="flex max-w-[560px] flex-col gap-6 rounded-[28px] border border-white/20 bg-[rgba(64,76,255,.62)] p-7 text-white shadow-[0_30px_80px_-30px_rgba(10,20,255,.9)] backdrop-blur-2xl md:p-10">
                      <div><span className="tag !border-white/25 !bg-white/10 !text-white/85">0{i + 2} · {c.eyebrow}</span></div>
                      <h2 className="display text-[clamp(40px,5.2vw,72px)]">{c.title}<br /><span className="text-white/80">{c.rest}</span></h2>
                      <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-white/80">{c.text}</p>
                      <Link href="/staff" tabIndex={stage === i + 1 ? 0 : -1} className="inline-flex items-center gap-3 self-start rounded-full bg-white py-2 pl-5 pr-2 text-[0.9375rem] font-semibold text-[#1f3bd8] transition hover:bg-white/90">Open dashboard <ArrowDot tone="blue" /></Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-7">
                      <div><Tag>0{i + 2} · {c.eyebrow}</Tag></div>
                      <h2 className="display text-[clamp(46px,6.4vw,88px)]">{c.title}<br /><span className="text-muted">{c.rest}</span></h2>
                      <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-muted">{c.text}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-6 mx-auto flex max-w-[1240px] items-center gap-4 px-5 lg:bottom-10">
            <div className="flex gap-1.5">{Array.from({ length: STAGES }, (_, i) => <StorySegment key={i} i={i} progress={progress} />)}</div>
            <motion.span animate={{ opacity: stage === 0 ? 1 : 0 }} className="font-mono text-[0.6875rem] uppercase tracking-[.18em] text-muted">Scroll</motion.span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- demo strip */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-5">
        <Reveal>
          <div className="panel hairline grid items-center gap-6 rounded-[28px] p-6 md:grid-cols-[0.8fr_2fr] md:p-8">
            <div>
              <p className="display text-[clamp(34px,4vw,52px)]">“In my language.”</p>
              <p className="mt-2 text-[0.875rem] text-muted">Four demo patients, four journeys.</p>
            </div>
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {DEMOS.map((d) => (
                <motion.div key={d.code} variants={item} whileHover={{ y: -4 }} transition={spring} className="min-w-[200px] flex-1">
                  <Link href={d.staff ? `/staff/${d.code}` : `/p/${d.code}`} className="glass flex h-full flex-col gap-3 rounded-2xl p-4 transition hover:border-line-strong">
                    <span className="flex items-center justify-between"><b className="text-[1.0625rem] font-semibold">{d.name}</b><span className="text-[0.8125rem] text-muted">{d.lang}</span></span>
                    <span className="text-[0.8125rem] text-muted">{d.meta}</span>
                    <span className="mt-auto flex items-center justify-between text-[0.8438rem] font-medium text-accent-text">{d.what}<ArrowDot tone="blue" size={22} /></span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- how it works */}
      <section id="how" className="relative z-10 mx-auto max-w-[1240px] px-5 py-28">
        <Reveal className="max-w-2xl">
          <Tag>How it works</Tag>
          <h2 className="display mt-5 text-[clamp(36px,4.6vw,60px)]">One companion.<br /><span className="text-muted">First question to full recovery.</span></h2>
        </Reveal>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <motion.div key={title} variants={item} whileHover={{ y: -6 }} transition={spring} className="glass hairline group relative overflow-hidden rounded-[26px] p-6">
              <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl transition group-hover:bg-accent/35" />
              <span className="relative grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-solid text-accent-text"><Icon size={22} /></span>
              <p className="relative mt-10 text-[0.8125rem] font-semibold text-muted">0{i + 1}</p>
              <h3 className="relative mt-1 text-[1.5rem] font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="relative mt-2 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------------------------------------------------------- numbers */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-5 pb-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <Tag>Measured, not promised</Tag>
            <h2 className="display mt-5 text-[clamp(36px,4.6vw,60px)]">Safety you<br /><span className="text-muted">can check.</span></h2>
            <p className="mt-5 max-w-[42ch] text-[1rem] leading-relaxed text-muted">Every message passes a red-flag check that works without AI. We publish how often it catches an emergency.</p>
            <Link href="/safety" className="mt-7 inline-flex items-center gap-3 rounded-full py-2 pl-5 pr-2 text-[0.9375rem] font-semibold btn-primary">Open the scorecard <ArrowDot /></Link>
          </Reveal>
          <div className="relative flex flex-col gap-4 lg:pl-10">
            <div className="sphere sphere-red float pointer-events-none absolute -bottom-6 -left-4 h-24 w-24 opacity-90" />
            <div className="sphere sphere-blue float pointer-events-none absolute -right-6 -top-10 h-20 w-20" style={{ animationDelay: "-3s" }} />
            {STATS.map((s, i) => (
              <Reveal key={s.value} delay={i * 0.08}>
                <motion.div whileHover={{ x: -6 }} transition={spring} className="glass hairline relative rounded-[22px] p-6" style={{ marginLeft: `${i * 7}%` }}>
                  <span className={cx("absolute right-5 top-5 h-2 w-2 rounded-full", s.dot)} />
                  <p className="display text-[3.375rem] leading-none">{s.value}</p>
                  <p className="mt-2 max-w-[30ch] text-[0.9062rem] text-muted">{s.label}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- surgeons */}
      <section id="surgeons" className="relative z-10 mx-auto max-w-[1240px] px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] p-8 md:p-12" style={{ background: "linear-gradient(135deg,#0d2a6b 0%,#1f5bd8 55%,#2f7bff 100%)" }}>
            <div className="sphere sphere-red float absolute right-[10%] top-[18%] h-24 w-24" />
            <div className="sphere sphere-yellow float absolute right-[24%] bottom-[14%] h-12 w-12" style={{ animationDelay: "-2s" }} />
            <div className="sphere sphere-blue float absolute -right-10 -bottom-16 h-56 w-56 opacity-80" style={{ animationDelay: "-4s" }} />
            <div className="relative max-w-xl text-white">
              <span className="tag !border-white/20 !bg-white/10 !text-white/80"><Stethoscope size={12} /> For surgeons</span>
              <h2 className="display mt-5 text-[clamp(34px,4.4vw,56px)]">A shortlist with reasons.<br /><span className="text-white/60">You approve every lens.</span></h2>
              <p className="mt-5 text-[1rem] leading-relaxed text-white/75">Both-eye plans, per-eye powers, the patient’s own words, and a live alert queue.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/staff" className="inline-flex items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2 text-[0.9375rem] font-semibold text-[#1f5bd8] transition hover:bg-white/90">Open dashboard <ArrowDot tone="blue" /></Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 text-[0.8125rem] text-white/80"><ShieldCheck size={14} /> Demo PIN 2468</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 border-t border-line px-5 py-8 text-[0.8125rem] text-muted">
        <Logo size={22} />
        <span>Decision support only. Never diagnoses. Every lens choice is approved by the surgeon.</span>
      </footer>
      {!reduce && <motion.div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ ...softSpring, opacity: { delay: 0.6, duration: 0.4 } }} />}
    </div>
  );
}

function StorySegment({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const fill = useTransform(progress, (p) => (i === 0 ? 1 : Math.min(1, Math.max(0, p - i + 1))));
  return (
    <span className="relative h-[3px] w-9 overflow-hidden rounded-full bg-line-strong">
      <motion.span style={{ scaleX: fill }} className="absolute inset-0 origin-left rounded-full bg-accent" />
    </span>
  );
}
