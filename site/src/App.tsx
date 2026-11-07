// @ts-nocheck
import { useEffect, useRef, useState, forwardRef, Fragment } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// React Bits (reactbits.dev) — copied verbatim, used through their props
import EvilEye from './rb/EvilEye'
import LightRays from './rb/LightRays'
import ScrollReveal from './rb/ScrollReveal'
import CardSwap, { Card } from './rb/CardSwap'
import CurvedLoop from './rb/CurvedLoop'
import SpotlightCard from './rb/SpotlightCard'
import ClickSpark from './rb/ClickSpark'
import BlurText from './rb/BlurText'
import ShinyText from './rb/ShinyText'
import RotatingText from './rb/RotatingText'
import MagicBento from './rb/MagicBento'
import GradientText from './rb/GradientText'
// Magic UI (magicui.design) — copied verbatim
import { Iphone } from './magicui/iphone'
import { AnimatedList } from './magicui/animated-list'
import { AnimatedBeam } from './magicui/animated-beam'
import { ScrollProgress } from './magicui/scroll-progress'
import { BorderBeam } from './magicui/border-beam'

import Simulator from './Simulator'

gsap.registerPlugin(ScrollTrigger)
const ACCENT = '#FF6F37'
const store = { get(k) { try { return localStorage.getItem(k) } catch { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch {} } }

function Editable({ k, fallback }) {
  const ref = useRef(null)
  useEffect(() => { const v = store.get('ds-' + k); if (v && ref.current) ref.current.textContent = v }, [k])
  return <b ref={ref} contentEditable suppressContentEditableWarning spellCheck={false} data-edit={k} className="font-medium text-white"
    onInput={e => { const t = e.currentTarget.textContent; store.set('ds-' + k, t); document.querySelectorAll('[data-edit="' + k + '"]').forEach(o => { if (o !== e.currentTarget) o.textContent = t }) }}
    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}>{fallback}</b>
}

function useInView(ref, threshold = .4) {
  const [v, setV] = useState(false)
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setV(true); io.disconnect() } }, { threshold }); io.observe(el); return () => io.disconnect() }, [])
  return v
}

const Scene = ({ id, title, className = '', children }) => (
  <section id={id} data-title={title} className={'scene ' + className}>{children}</section>
)
const Eyebrow = ({ children }) => <p className="eyebrow mb-6 flex items-center gap-3"><span className="h-px w-7 bg-[var(--accent)]" />{children}</p>

/* ---------- lens data ---------- */
const LENSES = [
  { name: 'Monofocal', desc: 'One focal point, usually set for distance.', m: [3, 1, 0, 1], spec: 'Single focus · lowest halo risk', glasses: 'For reading' },
  { name: 'Toric', desc: 'Corrects astigmatism. Made in monofocal and multifocal designs.', m: [3, 1, 0, 1], spec: 'Cylinder aligned to the steep corneal axis', glasses: 'Depends on design' },
  { name: 'EDOF', desc: 'Extended depth of focus. One focus stretched into a continuous range.', m: [3, 3, 1, 2], spec: 'Continuous range · mild halos', glasses: 'For fine print' },
  { name: 'Trifocal', desc: 'Splits light into three focal points: far, computer and reading.', m: [3, 3, 3, 3], spec: 'Diffractive optic · three foci', glasses: 'Often not needed' },
]
const Meter = ({ n, halo }) => <span className={'meter' + (halo ? ' halo' : '')}>{[0, 1, 2].map(i => <i key={i} className={i < n ? 'on' : ''} />)}</span>

function Defocus() {
  const ref = useRef(null); const seen = useInView(ref, .3)
  const W = 560, H = 330, m = { l: 52, r: 14, t: 30, b: 46 }, iw = W - m.l - m.r, ih = H - m.t - m.b
  const x = d => m.l + (1 - d) / 5 * iw, y = v => m.t + v / 0.8 * ih, clamp = v => Math.min(.8, Math.max(0, v))
  const fns = {
    mono: [d => .02 + .28 * d * d, '#A1A1AA'],
    edof: [d => .03 + .05 * d * d + .35 * Math.pow(Math.max(0, -d - 1.5), 2) + .25 * Math.pow(Math.max(0, d - .3), 2), '#7DD3FC'],
    tri: [d => Math.min(.02 + .3 * d * d, .10 + .3 * (d + 1.5) ** 2, .08 + .3 * (d + 2.5) ** 2), ACCENT],
  }
  const path = f => { let s = ''; for (let i = 0; i <= 160; i++) { const d = 1 - 5 * i / 160; s += (i ? 'L' : 'M') + x(d).toFixed(1) + ',' + y(clamp(f(d))).toFixed(1) } return s }
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Illustrative defocus curves">
      <g className="axis">
        {[0, .2, .4, .6, .8].map(v => <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} /><text x={m.l - 10} y={y(v) + 4} textAnchor="end">{v.toFixed(1)}</text></g>)}
        {[1, 0, -1, -2, -3, -4].map(d => <text key={d} x={x(d)} y={H - m.b + 20} textAnchor="middle">{d > 0 ? '+' + d : d < 0 ? '−' + -d : '0'}</text>)}
        <text x={m.l + iw / 2} y={H - 6} textAnchor="middle">Defocus (D)</text>
        <text x={14} y={m.t + ih / 2} textAnchor="middle" transform={`rotate(-90 14 ${m.t + ih / 2})`}>Acuity (logMAR)</text>
      </g>
      <g className="zone">{[[0, 'FAR'], [-1.5, 'COMPUTER'], [-2.5, 'READING']].map(([d, t]) => <g key={t}><line x1={x(d)} x2={x(d)} y1={m.t - 6} y2={m.t + ih} /><text x={x(d)} y={m.t - 12} textAnchor="middle">{t}</text></g>)}</g>
      {Object.entries(fns).map(([k, [f, c]], i) => <path key={k} d={path(f)} className="curve" stroke={c} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transitionDelay: i * .25 + 's' }} />)}
    </svg>
  )
}

/* ---------- chat ---------- */
const CHAT = [
  { who: 'bot', kn: 'ನಮಸ್ಕಾರ ರಮೇಶ್! ನಿಮ್ಮ ದಿನದ ಕೆಲಸದ ಬಗ್ಗೆ ಸ್ವಲ್ಪ ಹೇಳಿ.', en: 'Hello Ramesh! Tell me a little about your day-to-day work.' },
  { who: 'me', kn: 'ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ.', en: "I'm a tailor. I thread needles all day, and I ride my scooter at night.", voice: true },
  { who: 'bot', kn: 'ಸರಿ. ನಿಮಗೆ ಹತ್ತಿರದ ದೃಷ್ಟಿ ಮತ್ತು ರಾತ್ರಿಯ ದೃಷ್ಟಿ ಎರಡೂ ಮುಖ್ಯ.', en: 'Near vision and night vision both matter to you.' },
  { who: 'card' },
]
function Bubble({ c }) {
  if (c.who === 'card') return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#141416] p-3 text-left">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[.12em] text-[var(--accent)]">Shortlist for your doctor</p>
      {[['EDOF', .86], ['Trifocal · night halos', .79], ['Monofocal + readers', .64]].map(([n, v]) => (
        <div key={n} className="mb-2 text-[12px]"><div className="flex justify-between"><span>{n}</span><b className="font-mono font-medium">{v.toFixed(2)}</b></div>
          <div className="mt-1 h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-sky-300" style={{ width: v * 100 + '%' }} /></div></div>))}
      <p className="font-mono text-[10px] text-amber-300">● Waiting for surgeon approval</p>
    </div>)
  const me = c.who === 'me'
  return (
    <div className={'flex w-full ' + (me ? 'justify-end' : 'justify-start')}>
      <div className={'max-w-[88%] rounded-2xl px-3 py-2.5 text-left text-[13px] leading-snug ' + (me ? 'rounded-br-sm border border-orange-400/30 bg-orange-500/15' : 'rounded-bl-sm bg-[#18181b]')}>
        {c.voice && <div className="mb-1.5 flex h-4 items-center gap-[2px]">{Array.from({ length: 18 }).map((_, i) => <i key={i} className="w-[3px] rounded bg-[var(--accent)]" style={{ height: 30 + ((i * 37) % 70) + '%' }} />)}<small className="ml-1.5 font-mono text-[9px] text-zinc-400">0:07</small></div>}
        {c.kn}<span className="mt-1 block text-[11px] text-zinc-400">{c.en}</span>
      </div>
    </div>)
}
function Phone() {
  const ref = useRef(null); const seen = useInView(ref, .5); const [run, setRun] = useState(0)
  const S = { left: (21.25 / 433) * 100 + '%', top: (19.25 / 882) * 100 + '%', width: (389.5 / 433) * 100 + '%', height: (843.5 / 882) * 100 + '%', borderRadius: `${(55.75 / 389.5) * 100}% / ${(55.75 / 843.5) * 100}%` }
  return (
    <div ref={ref} className="relative mx-auto" style={{ height: 'min(640px,66vh)', aspectRatio: '433/882' }}>
      <Iphone className="h-full" />
      <div className="absolute z-10 flex flex-col overflow-hidden bg-black" style={S}>
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 pb-3 pt-12">
          <span className="relative h-8 w-8 rounded-full" style={{ background: `conic-gradient(${ACCENT},#7DD3FC,${ACCENT})` }}><span className="absolute inset-[8px] rounded-full bg-black" /></span>
          <div><b className="block text-[15px] font-semibold leading-tight">DrishtiSaathi</b><small className="font-mono text-[10px] text-sky-300">● listening</small></div>
          <span className="ml-auto rounded-full bg-orange-500/15 px-2 py-1 text-[11px] text-orange-300">ಕನ್ನಡ</span>
        </div>
        <div className="flex-1 overflow-hidden px-3 pt-3">
          {seen && <AnimatedList key={run} delay={1500} className="flex-col-reverse gap-2.5">{CHAT.map((c, i) => <Bubble key={'c' + i} c={c} />)}</AnimatedList>}
        </div>
        <button type="button" onClick={() => setRun(r => r + 1)} className="m-3 flex items-center gap-3 rounded-full border border-white/10 px-2 py-2 text-left font-mono text-[10.5px] text-zinc-400">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)]"><svg viewBox="0 0 24 24" width="16" height="16" fill="#000" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12z" /></svg></span>
          Hold to speak · tap to replay
        </button>
      </div>
    </div>
  )
}

/* ---------- bento visuals ---------- */
const Wave = () => <div className="flex h-16 items-center gap-1">{Array.from({ length: 30 }).map((_, i) => <i key={i} className="flex-1 rounded-sm bg-gradient-to-b from-orange-400 to-sky-300" style={{ height: 15 + Math.abs(Math.sin(i * 1.7)) * 85 + '%' }} />)}</div>
const Bio = () => (
  <div className="grid h-full grid-cols-2 gap-3 text-[12px]">
    <div className="rounded-xl border border-white/10 bg-black/50 p-3 font-mono leading-[1.9]">
      {[['Axial length', '23.42 mm'], ['K1 / K2', '43.50 / 44.00 D'], ['Corneal cyl', '0.50 D @ 92°'], ['ACD', '3.08 mm'], ['IOL power', '+21.5 D']].map(([a, b]) => <div key={a} className="flex justify-between gap-2"><span className="text-zinc-400">{a}</span>{b}</div>)}
      <small className="mt-1 block text-[10px] text-zinc-500">Sample IOLMaster-format data</small>
    </div>
    <div className="flex flex-col justify-center gap-2.5">
      {[['EDOF', 86, '+ needlework · + video calls'], ['Trifocal', 79, '+ near work · − night rides'], ['Monofocal + readers', 64, '+ lowest cost · − glasses']].map(([n, v, w]) => (
        <div key={n}><div className="flex justify-between text-[13px]"><span>{n}</span><b className="font-mono font-medium">{(v / 100).toFixed(2)}</b></div>
          <div className="my-1 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-[var(--accent)]" style={{ width: v + '%' }} /></div>
          <small className="font-mono text-[10.5px] text-zinc-400">{w}</small></div>))}
    </div>
  </div>)
const QA = () => (
  <div className="flex flex-col gap-2 text-[13px]">
    <div className="self-end rounded-2xl rounded-br-sm border border-orange-400/30 bg-orange-500/15 px-3 py-2">ಸ್ನಾನ ಯಾವಾಗ ಮಾಡಬಹುದು?<small className="block text-[11px] text-zinc-400">When can I take a bath?</small></div>
    <div className="rounded-2xl rounded-bl-sm bg-white/5 px-3 py-2">Keep water out of the operated eye for the first week. <span className="mt-1 block font-mono text-[10px] text-sky-300">Source · Clinic post-op guide, p. 2</span></div>
  </div>)
const Reminders = () => (
  <div className="flex flex-col gap-1.5 text-[12.5px]">
    {[['08:00', 'Antibiotic drops', 'Done ✓', ''], ['16:00', 'Antibiotic drops', 'Reminder sent', 'text-amber-300'], ['17:42', '"Sudden pain, vision worse"', 'Doctor alerted', 'text-rose-400']].map(([t, a, s, c]) => (
      <div key={t} className={'grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg border px-2.5 py-1.5 ' + (c.includes('rose') ? 'border-rose-400/40 bg-rose-500/10' : 'border-white/10 bg-black/40')}>
        <b className="font-mono font-medium text-zinc-400">{t}</b><span>{a}</span><em className={'font-mono text-[10.5px] not-italic ' + (c || 'text-sky-300')}>{s}</em></div>))}
  </div>)

const BENTO = [
  { label: 'Conversational AI', title: "Speaks the patient's language", description: 'Voice in, voice out in Kannada, Hindi, Tamil and English.', visual: <Wave />, colSpan: 2 },
  { label: 'Personalized recommendations', title: 'Daily life + eye measurements → a shortlist', description: 'Explainable scores. The surgeon approves the final lens.', visual: <Bio />, colSpan: 2, rowSpan: 2 },
  { label: 'Intelligent search', title: "Answers from the clinic's own guide", visual: <QA /> },
  { label: 'Support automation', title: 'Recovery, doctor in the loop', visual: <Reminders /> },
]

/* ---------- architecture ---------- */
const Node = forwardRef(({ t, s, hot }, ref) => (
  <div ref={ref} className={'z-10 rounded-2xl border bg-black px-4 py-3 shadow-[0_0_24px_-10px_rgba(0,0,0,.9)] ' + (hot ? 'border-[var(--accent)]' : 'border-white/15')}>
    <b className="block whitespace-nowrap text-[15px] font-semibold">{t}</b><small className="whitespace-nowrap font-mono text-[11px] text-zinc-400">{s}</small>
  </div>))
function Arch() {
  const c = useRef(null), r = Array.from({ length: 8 }, () => useRef(null))
  const [P, S, F, O, L, V, D, B] = r
  const beam = (a, b, cur = 0, rev = false, dl = 0) => <AnimatedBeam containerRef={c} fromRef={a} toRef={b} curvature={cur} reverse={rev} delay={dl} gradientStartColor={ACCENT} gradientStopColor="#7DD3FC" pathColor="#ffffff" pathOpacity={0.12} duration={4} />
  return (
    <div ref={c} className="relative overflow-x-auto rounded-3xl border border-white/10 bg-[#0A0A0B] p-8">
      <div className="flex min-w-[960px] items-center justify-between gap-6">
        <div className="flex flex-col"><Node ref={P} t="Patient" s="WhatsApp · web · voice" /></div>
        <div className="flex flex-col"><Node ref={S} t="Azure AI Speech" s="STT + TTS · kn · hi · ta" /></div>
        <div className="flex flex-col"><Node ref={F} t="FastAPI orchestrator" s="LangGraph · guardrails" hot /></div>
        <div className="flex flex-col gap-10"><Node ref={O} t="Azure OpenAI + RAG" s="AI Search · clinic docs" /><Node ref={L} t="Lens fit model" s="XGBoost + SHAP" /><Node ref={V} t="Vision simulator" s="OpenCV · WebGL" /></div>
        <div className="flex flex-col gap-16"><Node ref={D} t="Surgeon dashboard" s="Next.js · approvals" /><Node ref={B} t="Supabase" s="Postgres · pgvector" /></div>
      </div>
      {beam(P, S)}{beam(S, F, 0, false, .4)}{beam(F, O, -40, false, .8)}{beam(F, L, 0, false, .8)}{beam(F, V, 40, false, .8)}
      {beam(O, D, -10, false, 1.4)}{beam(L, D, 0, false, 1.4)}{beam(L, B, 0, false, 1.6)}{beam(V, B, 10, false, 1.6)}
    </div>)
}

/* ---------- presenter: keyboard stepping, HUD, camera guide ---------- */
function Presenter({ lenisRef }) {
  const [hud, setHud] = useState({ i: 0, n: 1, t: 'Intro' })
  const scenesRef = useRef([])
  useEffect(() => {
    const scenes = [...document.querySelectorAll('.scene')]; scenesRef.current = scenes
    const top = s => Math.round(s.getBoundingClientRect().top + scrollY)
    const stops = () => { const ys = []; scenes.forEach(s => { const t = top(s); ys.push(t); const extra = s.offsetHeight - innerHeight; if (extra > 60) ys.push(t + extra) }); return [...new Set(ys)].sort((a, b) => a - b) }
    const to = y => lenisRef.current ? lenisRef.current.scrollTo(y, { duration: 1.25, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: 'smooth' })
    const go = d => { const st = stops(), y = scrollY; let t = d > 0 ? st.find(s => s > y + 8) : [...st].reverse().find(s => s < y - 8); if (t === undefined) t = d > 0 ? st[st.length - 1] : 0; to(t) }
    const upd = () => { const probe = scrollY + innerHeight * .45; let i = 0; scenes.forEach((s, j) => { if (top(s) <= probe) i = j }); setHud({ i, n: scenes.length, t: scenes[i].dataset.title }) }
    const cams = ['right', 'center', 'left']; let ci = Math.max(0, cams.indexOf(store.get('ds-cam') || 'right')); document.body.dataset.cam = cams[ci]
    const key = e => {
      if (e.target.closest?.('[contenteditable],input,textarea')) return
      if (e.defaultPrevented) return
      const k = e.key
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); go(1) }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); go(-1) }
      else if (k === 'Home') { e.preventDefault(); to(0) }
      else if (k === 'c' || k === 'C') document.body.classList.toggle('cam-off')
      else if (k === 'h' || k === 'H') document.body.classList.toggle('hud-off')
      else if (k === 'v' || k === 'V') { ci = (ci + 1) % cams.length; document.body.dataset.cam = cams[ci]; store.set('ds-cam', cams[ci]) }
      else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.() }
    }
    ;(window as any).__go = (i) => to(top(scenes[i]))
    addEventListener('keydown', key); addEventListener('scroll', upd, { passive: true }); upd()
    return () => { removeEventListener('keydown', key); removeEventListener('scroll', upd) }
  }, [])
  const pad = n => String(n).padStart(2, '0')
  return (<>
    <div className="cam-guide" aria-hidden="true"><span>Camera</span></div>
    <div className="hud" aria-live="polite"><b>{pad(hud.i + 1)} / {pad(hud.n)}</b><span>{hud.t}</span><span className="keys opacity-70">← → move · C camera guide · V move guide · F fullscreen · H hide</span></div>
    <nav className="dots" aria-label="Scenes">{Array.from({ length: hud.n }).map((_, j) => <button key={j} type="button" aria-label={'Scene ' + (j + 1)} aria-current={j === hud.i} onClick={() => (window as any).__go(j)} />)}</nav>
  </>)
}

export default function App() {
  const lenisRef = useRef(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: .085 }); lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = t => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0)
    const refresh = () => ScrollTrigger.refresh(); document.fonts?.ready.then(refresh); addEventListener('load', refresh)
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  }, [])

  return (
    <ClickSpark sparkColor={ACCENT} sparkSize={12} sparkRadius={22} sparkCount={9} duration={450}>
      <ScrollProgress className="top-0 z-[70] h-[2px]" />
      <Presenter lenisRef={lenisRef} />
      <main>
        {/* 1 · HERO */}
        <Scene id="intro" title="Intro" className="overflow-hidden">
          <div className="pointer-events-auto absolute inset-y-0 right-[-8vw] w-[72vw] max-md:w-full max-md:opacity-50">
            <EvilEye eyeColor={ACCENT} intensity={1.5} pupilSize={0.6} irisWidth={0.25} glowIntensity={0.35} scale={0.8} noiseScale={1} pupilFollow={1} flameSpeed={1} backgroundColor="#000000" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="wrap relative z-10 flex flex-col gap-7">
            <ShinyText text="ZEISS Hackathon · AI-Powered Digital Experiences" color="#71717a" shineColor="#ffffff" speed={3} className="font-mono text-[13px] uppercase tracking-[.16em]" />
            <h1 className="text-[clamp(64px,11vw,190px)] font-semibold leading-[.86] tracking-[-.06em]">
              <BlurText text="Drishti" animateBy="letters" delay={60} direction="top" className="inline-flex" />
              <span className="serif text-[var(--accent)]"><BlurText text="Saathi" animateBy="letters" delay={60} direction="bottom" className="inline-flex" /></span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[clamp(20px,2vw,30px)] font-medium tracking-[-.02em]">
              <span className="text-zinc-400">Your lens decision, explained in</span>
              <RotatingText texts={['ಕನ್ನಡ', 'हिन्दी', 'தமிழ்', 'English']} rotationInterval={2200} splitBy="words" mainClassName="overflow-hidden rounded-xl bg-[var(--accent)] px-3 py-1 text-black" />
            </div>
            <p className="lede max-w-[46ch] text-zinc-300">A voice-first AI companion that helps cataract patients choose the right lens, and stays with them through recovery.</p>
            <p className="flex flex-wrap gap-x-7 gap-y-2 font-mono text-[13px] text-zinc-400"><span>Team <Editable k="team" fallback="Your team name" /></span><span>BMSIT&amp;M, Bengaluru</span></p>
          </div>
        </Scene>

        {/* 2 · PROBLEM */}
        <Scene id="problem" title="The problem">
          <div className="wrap">
            <Eyebrow>Part 1 · The problem</Eyebrow>
            <ScrollReveal baseOpacity={0.08} enableBlur baseRotation={3} blurStrength={6} textClassName="!text-[clamp(30px,4.2vw,68px)] !font-medium !leading-[1.08] !tracking-[-.035em] max-w-[22ch]">
              Every cataract patient has to choose the lens that will stay in their eye for life. Most choose in a few minutes, from an English brochure, in a language they don't speak at home.
            </ScrollReveal>
          </div>
        </Scene>

        {/* 3 · GAPS */}
        <Scene id="gaps" title="Where it breaks">
          <div className="wrap">
            <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
              <SpotlightCard spotlightColor="rgba(255,111,55,0.35)" className="!bg-[var(--accent)] !text-black">
                <div className="flex h-full flex-col justify-between gap-6">
                  <b className="text-[clamp(64px,7vw,116px)] font-bold leading-[.85] tracking-[-.06em]">No.&nbsp;1</b>
                  <p className="text-[19px] font-semibold leading-snug">Cataract is the leading cause of blindness in India.</p>
                  <small className="font-mono text-[11px] opacity-70">National Blindness &amp; Visual Impairment Survey, 2015–19</small>
                </div>
              </SpotlightCard>
              {[['Before surgery', 'Rushed counselling', 'Monofocal, toric, EDOF, trifocal. Four very different results, explained in one short consultation.'],
                ['In the brochure', 'English and jargon', 'Dioptre, astigmatism, halos. Words that reach families who think in Kannada, Hindi or Tamil.'],
                ['After surgery', 'Calls that never stop', 'Clinics answer the same questions about drops, pain and precautions, while real warning signs wait in the queue.']].map(([t, h, p]) => (
                <SpotlightCard key={h} spotlightColor="rgba(255,111,55,0.25)">
                  <div className="flex flex-col gap-4"><span className="font-mono text-[11px] uppercase tracking-[.16em] text-zinc-500">{t}</span>
                    <h3 className="text-[26px] font-semibold leading-tight tracking-[-.03em]">{h}</h3><p className="text-[16px] leading-relaxed text-zinc-400">{p}</p></div>
                </SpotlightCard>))}
            </div>
            <BlurText text="So patients pick on price alone, or regret a lens they paid more for." delay={40} className="serif mt-10 text-[clamp(24px,2.6vw,40px)] text-white" />
          </div>
        </Scene>

        {/* 4 · LENSES */}
        <Scene id="lenses" title="Four lens types">
          <div className="wrap grid items-center gap-10 lg:grid-cols-2">
            <div className="min-w-0">
              <Eyebrow>The decision</Eyebrow>
              <h2 className="h2">Four lens types.<br /><span className="serif text-[var(--accent)]">Four ways of seeing.</span></h2>
              <div className="mt-8 rounded-3xl border border-white/10 bg-[#0A0A0B] p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3"><b className="text-[17px] font-semibold">Defocus curves</b>
                  <span className="flex gap-4 font-mono text-[11px] text-zinc-400"><span className="text-zinc-300">— Monofocal</span><span className="text-sky-300">— EDOF</span><span className="text-[var(--accent)]">— Trifocal</span></span></div>
                <Defocus />
                <p className="mt-2 font-mono text-[10.5px] text-zinc-500">Illustrative shapes, not patient data.</p>
              </div>
            </div>
            <div className="relative h-[520px] min-w-0">
              <CardSwap width={420} height={360} cardDistance={56} verticalDistance={64} delay={3600} pauseOnHover skewAmount={5}>
                {LENSES.map(l => (
                  <Card key={l.name}><div className="lens-card">
                    <h3 className="text-[34px] font-semibold tracking-[-.04em]">{l.name}</h3>
                    <p className="min-h-[3em] text-[15px] text-zinc-400">{l.desc}</p>
                    <div className="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-2.5 font-mono text-[11px] uppercase tracking-[.08em] text-zinc-400">
                      {['Far', 'Computer', 'Reading', 'Night halos'].map((r, i) => <Fragment key={r}><span>{r}</span><Meter n={l.m[i]} halo={i === 3} /></Fragment>)}
                    </div>
                    <p className="mt-auto flex justify-between border-t border-white/10 pt-3 text-[14px]">Glasses after surgery <span className="text-zinc-400">{l.glasses}</span></p>
                  </div></Card>))}
              </CardSwap>
            </div>
          </div>
        </Scene>

        {/* 5 · SOLUTION */}
        <Scene id="solution" title="Our solution" className="overflow-hidden">
          <div className="wrap grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <div className="flex min-w-0 flex-col gap-6">
              <Eyebrow>Part 2 · Our solution</Eyebrow>
              <h2 className="h2">Meet <span className="serif text-[var(--accent)]">DrishtiSaathi.</span></h2>
              <p className="lede">Patients talk to it the way they talk to a family member. It listens in their language, learns how they live, and turns a confusing medical choice into a clear conversation that the surgeon signs off on.</p>
              <div className="flex flex-wrap gap-2 font-mono text-[12px]">{['Voice-first', 'WhatsApp or web app', 'Surgeon in the loop', 'Works on any phone'].map((t, i) => <span key={t} className={'rounded-full border px-3 py-2 ' + (i ? 'border-white/20' : 'border-[var(--accent)] bg-[var(--accent)] text-black')}>{t}</span>)}</div>
            </div>
            <Phone />
          </div>
          <div className="mt-2 text-white/90">
            <CurvedLoop marqueeText="ಕನ್ನಡ ✦ हिन्दी ✦ தமிழ் ✦ తెలుగు ✦ മലയാളം ✦ मराठी ✦ বাংলা ✦ English ✦ " speed={1.4} curveAmount={120} fontSize={64} fontWeight={600} />
          </div>
        </Scene>

        {/* 6 · FEATURES */}
        <Scene id="features" title="How it helps">
          <div className="wrap">
            <Eyebrow>One assistant, four jobs</Eyebrow>
            <h2 className="h2 mb-10">From first question <span className="serif text-[var(--accent)]">to full recovery.</span></h2>
            <MagicBento items={BENTO} columns={4} rowHeight={230} gap={14} radius={22} glowColor="255, 111, 55" enableStars enableSpotlight enableBorderGlow enableTilt={false} enableMagnetism clickEffect textAutoHide={false} />
          </div>
        </Scene>

        {/* 7 · SIMULATOR */}
        <Scene id="simulator" title="See before you choose">
          <div className="wrap">
            <Eyebrow>Vision preview</Eyebrow>
            <h2 className="h2 mb-10">See your choice <span className="serif text-[var(--accent)]">before you make it.</span></h2>
            <div className="relative rounded-[22px]"><Simulator /></div>
          </div>
        </Scene>

        {/* 8 · IMPACT */}
        <Scene id="impact" title="Expected impact">
          <div className="wrap">
            <Eyebrow>Expected impact</Eyebrow>
            <h2 className="h2 mb-10">Confidence for patients. <span className="serif text-[var(--accent)]">Time back for surgeons.</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead><tr className="font-mono text-[12px] uppercase tracking-[.14em]"><th className="w-[16%]"></th><th className="pb-4 text-left font-medium text-zinc-500">Today</th><th className="pb-4 text-left font-medium text-[var(--accent)]">With DrishtiSaathi</th></tr></thead>
                <tbody>{[['The decision', 'Chosen on price, in minutes', "Chosen on daily life, explained in the patient's language"],
                  ['Counselling', 'The same explanation repeated for every patient', 'Surgeon reviews a ready, explained shortlist'],
                  ['After surgery', 'Phone lines full of repeat questions', "Instant answers from the clinic's own protocols"],
                  ['Warning signs', 'Noticed late', 'Flagged to the doctor right away'],
                  ['For ZEISS', 'Premium lenses seen as an expensive mystery', 'Each lens explained clearly, in every Indian language']].map(([a, b, c]) => (
                  <tr key={a} className="border-t border-white/10 align-top">
                    <td className="pt-7 font-mono text-[12px] uppercase tracking-[.1em] text-zinc-500">{a}</td>
                    <td className="w-[36%] py-5 pr-6 text-[clamp(16px,1.3vw,20px)] text-zinc-500 line-through decoration-rose-400/50">{b}</td>
                    <td className="py-5"><BlurText text={c} delay={30} className="text-[clamp(21px,2vw,32px)] font-medium leading-tight tracking-[-.025em]" /></td>
                  </tr>))}</tbody>
              </table>
            </div>
          </div>
        </Scene>

        {/* 9 · ARCHITECTURE */}
        <Scene id="build" title="How we build it">
          <div className="wrap">
            <Eyebrow>Part 3 · Execution</Eyebrow>
            <h2 className="h2 mb-10">Built on Azure, <span className="serif text-[var(--accent)]">grounded by design.</span></h2>
            <Arch />
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[12px] text-sky-300">{['Surgeon approves every recommendation', 'Never diagnoses', 'Every answer cites a clinic source', 'Urgent symptoms go straight to a doctor', 'DPDP Act 2023 aware'].map(t => <span key={t} className="rounded-full border border-sky-300/30 px-3 py-2">{t}</span>)}</div>
          </div>
        </Scene>

        {/* 10 · ROADMAP */}
        <Scene id="roadmap" title="Build plan">
          <div className="wrap">
            <Eyebrow>Build plan</Eyebrow>
            <h2 className="h2 mb-10">Four phases <span className="serif text-[var(--accent)]">to a working pilot.</span></h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[['Knowledge & data', ['Clinic protocols in Kannada, Hindi, Tamil', 'Lens fact sheets and safety rules', 'Synthetic IOLMaster-format biometry']],
                ['Voice + RAG assistant', ['Azure Speech pipeline', 'Answers with source citations', 'Red-flag symptom classifier']],
                ['Recommend + visualise', ['Lens fit model with SHAP reasons', 'Vision simulator for each lens', 'Shortlist sent to the surgeon']],
                ['Surgeon loop & testing', ['Approval dashboard', 'Answer-accuracy and safety tests', 'Feedback from doctors and patients']]].map(([h, items], i) => (
                <div key={h} className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0B] p-6">
                  <span className="font-mono text-[12px] uppercase tracking-[.14em] text-[var(--accent)]">Phase {i + 1}</span>
                  <h3 className="mb-4 mt-3 text-[24px] font-semibold leading-tight tracking-[-.03em]">{h}</h3>
                  <ul className="flex flex-col gap-2 text-[15px] text-zinc-400">{items.map(t => <li key={t} className="flex gap-2"><span className="mt-[.6em] h-1.5 w-1.5 flex-none rounded-full bg-sky-300" />{t}</li>)}</ul>
                  <BorderBeam duration={8} delay={i * 2} size={120} colorFrom={ACCENT} colorTo="#7DD3FC" />
                </div>))}
            </div>
          </div>
        </Scene>

        {/* 11 · CLOSE */}
        <Scene id="close" title="Thank you" className="overflow-hidden">
          <div className="absolute inset-0"><LightRays raysOrigin="top-center" raysColor={ACCENT} raysSpeed={1} lightSpread={0.8} rayLength={1.4} followMouse mouseInfluence={0.1} /></div>
          <div className="wrap relative z-10 flex flex-col gap-8">
            <Eyebrow>Thank you</Eyebrow>
            <h2 className="text-[clamp(56px,10vw,170px)] font-semibold leading-[.88] tracking-[-.06em]">See the choice<br />
              <GradientText colors={[ACCENT, '#FFD3A8', '#7DD3FC', ACCENT]} animationSpeed={6} className="serif !mx-0">clearly.</GradientText></h2>
            <p className="lede text-zinc-300">DrishtiSaathi helps every patient understand their lens before surgery, and keeps them safe after it.</p>
            <p className="flex flex-wrap gap-x-9 gap-y-2 font-mono text-[14px] text-zinc-400"><span>Team <Editable k="team" fallback="Your team name" /></span><Editable k="members" fallback="Add team member names" /><span>BMSIT&amp;M, Bengaluru</span></p>
          </div>
        </Scene>
      </main>
    </ClickSpark>
  )
}
