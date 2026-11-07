// @ts-nocheck
import { useEffect, useRef, useState } from 'react'

const SW = 1600, SH = 900
type Mode = 'cataract' | 'monofocal' | 'edof' | 'trifocal'
export const MODES: Record<Mode, any> = {
  cataract: { far: 'blur(5px) sepia(.55) saturate(.7) contrast(.75) brightness(.92)', near: 'blur(6px) sepia(.5) contrast(.8)', halo: 'bloom', haloF: 'blur(3px)', veil: 1, label: 'Cataract today', rows: ['Blurred, faded colours', 'Blurred', 'Blurred', 'Glare around every light'], warn: [] },
  monofocal: { far: 'none', near: 'blur(5px)', halo: 'none', haloF: 'none', veil: 0, label: 'Monofocal', rows: ['Sharp', 'Fair', 'Needs reading glasses', 'Minimal halos'], warn: [2] },
  edof: { far: 'none', near: 'blur(1.8px)', halo: 'mild', haloF: 'blur(.5px)', veil: 0, label: 'EDOF', rows: ['Sharp', 'Sharp', 'Good, glasses for fine print', 'Mild halos possible'], warn: [] },
  trifocal: { far: 'none', near: 'none', halo: 'rings', haloF: 'blur(.6px)', veil: 0, label: 'Trifocal', rows: ['Sharp', 'Sharp', 'Sharp', 'Halos and glare more likely'], warn: [3] },
}
const ROWS = ['Far', 'Computer', 'Reading', 'At night']

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const lerp = (a, b, t) => a + (b - a) * t

function buildScene() {
  const rnd = rng(7), lights = []
  const far = document.createElement('canvas'), near = document.createElement('canvas')
  far.width = near.width = SW; far.height = near.height = SH
  const g = far.getContext('2d'), HZ = 520
  const sky = g.createLinearGradient(0, 0, 0, HZ); sky.addColorStop(0, '#02060d'); sky.addColorStop(.7, '#0b1824'); sky.addColorStop(1, '#2a2622')
  g.fillStyle = sky; g.fillRect(0, 0, SW, HZ)
  for (let i = 0; i < 140; i++) { g.fillStyle = 'rgba(255,255,255,' + (.2 + rnd() * .6) + ')'; g.fillRect(rnd() * SW, rnd() * 360, 1.6, 1.6) }
  let x = 0
  while (x < SW) { const w = 60 + rnd() * 120, h = 70 + rnd() * 230; g.fillStyle = '#060c13'; g.fillRect(x, HZ - h, w, h)
    for (let wy = HZ - h + 12; wy < HZ - 14; wy += 18) for (let wx = x + 10; wx < x + w - 10; wx += 16) if (rnd() < .2) { g.fillStyle = 'rgba(244,194,122,' + (.45 + rnd() * .4) + ')'; g.fillRect(wx, wy, 7, 10) }
    x += w + 4 + rnd() * 10 }
  g.fillStyle = '#0a0f14'; g.fillRect(0, HZ, SW, SH - HZ)
  g.fillStyle = '#14191e'; g.beginPath(); g.moveTo(770, HZ); g.lineTo(830, HZ); g.lineTo(1560, SH); g.lineTo(40, SH); g.closePath(); g.fill()
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(770, HZ); g.lineTo(40, SH); g.moveTo(830, HZ); g.lineTo(1560, SH); g.stroke()
  g.fillStyle = 'rgba(240,230,200,.7)'
  for (let i = 0; i < 9; i++) { const t0 = Math.pow(i / 9, 1.6), t1 = Math.pow((i + .45) / 9, 1.6); const ya = HZ + t0 * (SH - HZ), yb = HZ + t1 * (SH - HZ), wa = 2 + t0 * 14, wb = 2 + t1 * 14; g.beginPath(); g.moveTo(800 - wa / 2, ya); g.lineTo(800 + wa / 2, ya); g.lineTo(800 + wb / 2, yb); g.lineTo(800 - wb / 2, yb); g.fill() }
  ;[.12, .24, .4, .62, .9].forEach(t => { const y = HZ + t * (SH - HZ)
    ;[[lerp(765, 40, t) - 50 * t, -1], [lerp(835, 1560, t) + 50 * t, 1]].forEach(([px, side]) => { if (side < 0 && t > .5) return
      const h = 24 + 300 * t, r = 3 + 9 * t; g.strokeStyle = '#1d262f'; g.lineWidth = 1 + 4 * t; g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - h); g.lineTo(px - side * 28 * t, y - h); g.stroke()
      g.fillStyle = '#ffe2b0'; g.beginPath(); g.arc(px - side * 28 * t, y - h, r, 0, 7); g.fill(); lights.push({ x: px - side * 28 * t, y: y - h, r, c: '255,214,160' }) }) })
  const cy1 = HZ + .28 * (SH - HZ); g.fillStyle = '#0b0e12'; g.fillRect(852, cy1 - 26, 70, 30)
  ;[[862, cy1 - 8], [912, cy1 - 8]].forEach(([lx, ly]) => { g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.fill(); lights.push({ x: lx, y: ly, r: 7, c: '235,242,255' }) })
  const cy2 = HZ + .45 * (SH - HZ); g.fillStyle = '#0b0e12'; g.fillRect(610, cy2 - 40, 110, 46)
  ;[[624, cy2 - 14], [706, cy2 - 14]].forEach(([lx, ly]) => { g.fillStyle = '#ff4b3e'; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.fill(); lights.push({ x: lx, y: ly, r: 7, c: '255,80,60' }) })
  const sx = 1010, sy = HZ + .2 * (SH - HZ); g.strokeStyle = '#1d262f'; g.lineWidth = 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 150); g.stroke()
  g.fillStyle = '#0d1217'; g.fillRect(sx - 14, sy - 210, 28, 66); g.fillStyle = '#4dffaa'; g.beginPath(); g.arc(sx, sy - 158, 8, 0, 7); g.fill(); lights.push({ x: sx, y: sy - 158, r: 8, c: '90,255,170' })
  g.fillStyle = '#1d262f'; g.fillRect(1120, 330, 8, 190); g.fillRect(1392, 330, 8, 190)
  g.fillStyle = '#0f6b45'; g.strokeStyle = '#e9f0ef'; g.lineWidth = 5; g.beginPath(); g.roundRect ? g.roundRect(1080, 250, 360, 150, 12) : g.rect(1080, 250, 360, 150); g.fill(); g.stroke()
  g.fillStyle = '#fff'; g.font = '700 62px Geist, system-ui, sans-serif'; g.fillText('MYSURU', 1108, 322)
  g.font = '600 40px Geist, system-ui, sans-serif'; g.fillText('12 km  →', 1112, 378)
  const n = near.getContext('2d'); n.save(); n.translate(400, 742); n.rotate(-.06)
  n.shadowColor = 'rgba(0,0,0,.6)'; n.shadowBlur = 40; n.fillStyle = '#efe7d6'; n.beginPath(); n.roundRect ? n.roundRect(-290, -160, 580, 320, 16) : n.rect(-290, -160, 580, 320); n.fill(); n.shadowBlur = 0
  n.fillStyle = '#8a5a2b'; n.font = '600 22px "Geist Mono", monospace'; n.fillText('POST-OP DROPS · RIGHT EYE', -256, -112)
  n.fillStyle = '#22201c'; n.font = '600 27px Geist, system-ui, sans-serif'
  n.fillText('Antibiotic drops', -256, -58); n.fillText('1 drop · 4× a day', 40, -58)
  n.fillText('Anti-inflammatory', -256, -12); n.fillText('1 drop · 3× a day', 40, -12)
  n.font = '500 21px Geist, system-ui, sans-serif'; n.fillStyle = '#4a453c'
  n.fillText('Do not rub the eye. Wear the shield at night.', -256, 40); n.fillText('Next check-up: day 7 · Bring this card.', -256, 74)
  n.strokeStyle = '#b9ad95'; n.lineWidth = 2; n.beginPath(); n.moveTo(-256, -90); n.lineTo(256, -90); n.stroke(); n.restore()
  return { far, near, lights }
}
function drawHalo(cv, type, lights) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, SW, SH); g.globalCompositeOperation = 'lighter'
  lights.forEach(l => {
    const glow = (rad, a) => { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, rad); gr.addColorStop(0, 'rgba(' + l.c + ',' + a + ')'); gr.addColorStop(.35, 'rgba(' + l.c + ',' + (a * .35) + ')'); gr.addColorStop(1, 'rgba(' + l.c + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(l.x, l.y, rad, 0, 7); g.fill() }
    const ring = (rad, a, w) => { g.strokeStyle = 'rgba(' + l.c + ',' + a + ')'; g.lineWidth = w; g.beginPath(); g.arc(l.x, l.y, rad, 0, 7); g.stroke() }
    if (type === 'bloom') { glow(l.r * 12, .55); glow(l.r * 4, .5) }
    else if (type === 'rings') { glow(l.r * 3.2, .42); ring(l.r * 3.6, .32, Math.max(1.5, l.r * .45)); ring(l.r * 5.4, .2, Math.max(1.2, l.r * .35)) }
    else if (type === 'mild') { glow(l.r * 3, .3); ring(l.r * 3.4, .13, Math.max(1.2, l.r * .35)) }
    else glow(l.r * 2.2, .25)
  })
  g.globalCompositeOperation = 'source-over'
}

function Stack({ scene, mode, className = '' }) {
  const farR = useRef(null), nearR = useRef(null), haloR = useRef(null)
  useEffect(() => { if (!scene) return; farR.current.getContext('2d').drawImage(scene.far, 0, 0); nearR.current.getContext('2d').drawImage(scene.near, 0, 0) }, [scene])
  useEffect(() => { if (scene) drawHalo(haloR.current, MODES[mode].halo, scene.lights) }, [scene, mode])
  const m = MODES[mode]
  return (
    <div className={'stack ' + className}>
      <canvas ref={farR} width={SW} height={SH} style={{ filter: m.far }} />
      <div className="veil" style={{ opacity: m.veil }} />
      <canvas ref={haloR} width={SW} height={SH} style={{ filter: m.haloF }} />
      <canvas ref={nearR} width={SW} height={SH} style={{ filter: m.near }} />
    </div>
  )
}

export default function Simulator() {
  const [scene, setScene] = useState(null)
  const [mode, setMode] = useState<Mode>('trifocal')
  const [pos, setPos] = useState(50)
  const simR = useRef(null), drag = useRef(false), swept = useRef(false)
  useEffect(() => {
    const ready = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()
    ready.then(() => setScene(buildScene()))
  }, [])
  useEffect(() => {
    const el = simR.current; if (!el) return
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting && !swept.current) { swept.current = true
        const keys = [[400, 22], [1500, 64], [2500, 50]]; keys.forEach(([t, p]) => setTimeout(() => setPos(p), t)) }
    }, { threshold: .5 }); io.observe(el); return () => io.disconnect()
  }, [])
  const clamp = p => Math.max(3, Math.min(97, p))
  const fromEvt = e => { const r = simR.current.getBoundingClientRect(); setPos(clamp((e.clientX - r.left) / r.width * 100)) }
  const m = MODES[mode], t = MODES.cataract
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start">
      <div ref={simR} className="sim" style={{ ['--pos' as any]: pos + '%', transition: 'none' }}
        onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromEvt(e) }}
        onPointerMove={e => drag.current && fromEvt(e)} onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}>
        <Stack scene={scene} mode="cataract" />
        <Stack scene={scene} mode={mode} className="right" />
        <span className="absolute left-4 top-4 z-[2] rounded-md bg-black/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[.12em]">Cataract today</span>
        <span className="absolute right-4 top-4 z-[2] rounded-md bg-black/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--accent)]">After · {m.label}</span>
        <div className="sim-handle" style={{ transition: 'left .9s cubic-bezier(.65,0,.35,1)' }}>
          <button type="button" aria-label="Drag to compare. Use left and right arrow keys."
            onKeyDown={e => { if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setPos(p => clamp(p - 5)) } if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setPos(p => clamp(p + 5)) } }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lens type">
          {(['monofocal', 'edof', 'trifocal'] as Mode[]).map(k => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={'rounded-full border px-4 py-2.5 font-mono text-[13px] transition-colors ' + (mode === k ? 'border-[var(--accent)] bg-[var(--accent)] text-black' : 'border-white/20 text-white hover:border-white/50')}>{MODES[k].label}</button>
          ))}
        </div>
        <table className="w-full border-collapse text-[15px]">
          <thead><tr><th></th><th className="pb-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[.12em] text-zinc-400">Today</th><th className="pb-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[.12em] text-zinc-400">{m.label}</th></tr></thead>
          <tbody>{ROWS.map((r, i) => (
            <tr key={r} className="border-t border-white/10">
              <td className="w-[28%] py-3 pr-2 align-top font-mono text-[12px] uppercase tracking-[.06em] text-zinc-400">{r}</td>
              <td className="py-3 pr-3 align-top text-zinc-400">{t.rows[i]}</td>
              <td className={'py-3 align-top ' + (m.warn.includes(i) ? 'text-rose-400' : 'text-white')}>{m.rows[i]}</td>
            </tr>))}</tbody>
        </table>
        <p className="font-mono text-[11px] leading-relaxed text-zinc-500">Illustrative simulation to support counselling. It is not a medical prediction for any patient.</p>
      </div>
    </div>
  )
}
