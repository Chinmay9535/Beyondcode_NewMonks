import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {Shots} from '../lib/shots';
import {W, H, scene, at, atPhrase, ramp, useT, clamp, lerp, rnd, easeOut, easeInOut, mixColor, noise1} from '../lib/util';
import {Glow, Vignette, Black, Particles, Smoke, GodRays, Caption, Flame, CINZEL, CORM} from '../lib/fx';
import {Sky, Sun, Ridge, Clouds, Pillar, IndiaMap, proj, Stars, Rider, Pothi} from '../lib/sets';
import {Face, exprTrack, EX} from '../chars/face';
import {Puppet, P, poseTrack, talk, walk} from '../chars/puppet';
import {ASHOKA, ASHOKA_FIT, folk} from '../chars/cast2';
import {FogPlane, DhauliRock, Hut, Palm, Crowd, Lantern} from '../lib/sets2';
import {mouth} from '../lib/lips';

/* =========================== P06: this is history =========================== */
const sc6 = scene('p06_edicts');
const History: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const day = ramp(t, 1.2, 3.6);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.25, y: -40, f: 1}, {t: 5.5, z: 1.0, y: 0, f: 1}]} dof={6}>
        <Layer depth={0.04}><Sky id="dh" stops={[[0, mixColor('#120606', '#5a7ab0', day)], [0.6, mixColor('#3a0a08', '#f0c090', day)], [1, mixColor('#5a1410', '#fff0c8', day)]]} /><Sun x={1450} y={640} r={70} color="#fff6e0" glow="#ffc890" haze={day} /></Layer>
        <Layer depth={0.25}><Ridge y={780} amp={40} color={mixColor('#2a0a08', '#8a7a6a', day)} seed={3} freq={0.002} /></Layer>
        <FogPlane depth={0.35} color={mixColor('#3a0a08', '#f4d8b8', day)} opacity={0.35} top={600} fade={0.1} />
        <Layer depth={0.6}>
          <Palm x={260} y={900} h={560} color={mixColor('#1a0604', '#3a4a2a', day)} seed={2} />
          <Palm x={1760} y={900} h={480} color={mixColor('#1a0604', '#3a4a2a', day)} seed={5} />
          <rect x={-1000} y={880} width={W + 2000} height={600} fill={mixColor('#1a0604', '#7a6a4a', day)} />
        </Layer>
        <Layer depth={1}>
          <DhauliRock x={900} y={980} s={1.25} c={mixColor('#2a1410', '#7a6e62', day)} hi={mixColor('#5a2a20', '#d8c8b0', day)} />
        </Layer>
        <Layer depth={1.2}><Particles n={40} seed={3} color="#fff0d0" size={[1, 2.5]} speed={[-3, -8]} wind={6} opacity={0.5 * day} /></Layer>
      </Camera>
      <Caption t={t} a={2.6} b={7} x={150} y={H - 200} size={28} spacing={8}>DHAULI · ODISHA</Caption>
      <Caption t={t} a={3.0} b={7} x={152} y={H - 162} size={24} spacing={3} font={CORM} color="#f0e0c0">The Kalinga edicts of Ashoka, carved c. 260 BCE</Caption>
      <Vignette strength={0.75} />
    </AbsoluteFill>
  );
};
const SITES: [number, number][] = [[70.5, 21.5], [77.8, 30.5], [72.2, 34.2], [73.2, 34.3], [85.8, 20.2], [84.8, 19.5], [72.8, 19.4], [77.3, 15.2], [65.7, 31.6], [76.9, 16.9], [76.6, 15.9], [76.8, 14.8], [76.2, 27.4], [80.0, 23.5], [84.0, 24.9], [84.4, 27.0], [84.5, 27.3], [83.0, 25.4], [77.2, 28.6], [77.7, 23.5], [81.8, 25.4], [83.3, 27.5], [83.0, 25.0], [78.6, 25.2], [77.6, 22.6], [76.8, 15.3], [76.8, 15.0]];
const AtOnce: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tA = at(sc6, 'once.') - off - 0.5;
  const k = ramp(t, tA, tA + 0.35);
  const k2 = 24, ox = 528, oy = 120;
  return (
    <AbsoluteFill style={{background: '#0a0604'}}>
      <Camera keys={[{t: 0, z: 1.3, y: -40}, {t: tA, z: 1.05, y: 0}, {t: tA + 3, z: 1.0}]} drift={0.4}>
        <Layer depth={1}>
          <defs><radialGradient id="pm2" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#3a2a1c" /><stop offset="1" stopColor="#0a0604" /></radialGradient></defs>
          <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="url(#pm2)" />
          <IndiaMap k={k2} ox={ox} oy={oy} fill={1} kalinga={0} land="#2a2018" empire="#4a3420" kalingaColor="#4a3420" line="#8a6a3a" />
          {SITES.map(([lo, la], i) => {
            const [x, y] = proj(lo, la, k2, ox, oy);
            const ring = ((t - tA) * 1.3 + rnd(i) * 0.3) % 1;
            return (
              <g key={i} opacity={k}>
                <circle cx={x} cy={y} r={7} fill="#ffd27a" style={{filter: 'drop-shadow(0 0 8px #ffb347)'}} />
                {t > tA && <circle cx={x} cy={y} r={8 + ring * 70} fill="none" stroke="#ffd27a" strokeWidth={2} opacity={1 - ring} />}
              </g>
            );
          })}
          {(() => { const [x, y] = proj(85.1, 25.6, k2, ox, oy); return <g><circle cx={x} cy={y} r={12} fill="#fff4d0" /><text x={x + 18} y={y - 14} fontFamily={CINZEL} fontSize={20} fill="#f0d8a8" letterSpacing={3}>PATALIPUTRA</text></g>; })()}
        </Layer>
      </Camera>
      <div style={{position: 'absolute', left: 0, right: 0, top: H - 210, textAlign: 'center', fontFamily: CINZEL, fontSize: 24, letterSpacing: 8, color: '#f0d8a8', opacity: k}}>EDICTS OF ASHOKA · ROCK AND PILLAR SITES</div>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
export const P06: React.FC = () => {
  const b = at(sc6, 'After') - 0.3;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc6.dur} shots={[
        {from: 0, to: b, fadeIn: 0, render: (o) => <History off={o} />},
        {from: b, to: sc6.dur, fadeIn: 0.7, render: (o) => <AtOnce off={o} />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== shared: the throne hall (multiplane) =========================== */
export const Hall: React.FC<{dark?: number}> = ({dark = 0}) => (
  <>
    <Layer depth={0.3}>
      <rect x={-1200} y={-800} width={W + 2400} height={H + 1600} fill="#4a2814" />
      {[260, 660, 1060, 1460, 1860].map((x, i) => (
        <g key={i}>
          <rect x={x - 70} y={120} width={140} height={300} fill="#ffd89a" />
          {Array.from({length: 6}).map((_, j) => <line key={j} x1={x - 70 + j * 28} y1={120} x2={x - 70 + j * 28} y2={420} stroke="#4a2814" strokeWidth={6} />)}
          {Array.from({length: 10}).map((_, j) => <line key={'h' + j} x1={x - 70} y1={120 + j * 30} x2={x + 70} y2={120 + j * 30} stroke="#4a2814" strokeWidth={5} />)}
        </g>
      ))}
    </Layer>
    <Layer depth={0.38}>
      <GodRays x={660} y={160} angle={65} spread={50} n={8} len={1400} color="#ffe0a8" opacity={0.25} seed={4} />
      <GodRays x={1460} y={160} angle={110} spread={50} n={8} len={1400} color="#ffe0a8" opacity={0.22} seed={7} />
    </Layer>
    <FogPlane depth={0.42} color="#c08050" opacity={0.25} />
    <Layer depth={0.55}>
      {Array.from({length: 9}).map((_, i) => <Pillar key={i} x={-300 + i * 320} y={960} h={700} w={52} color="#6a3a1a" hi="#ffd89a" />)}
      <defs><linearGradient id="hfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5428" /><stop offset="1" stopColor="#2a140a" /></linearGradient></defs>
      <rect x={-1200} y={950} width={W + 2400} height={800} fill="url(#hfl)" />
      <ellipse cx={960} cy={990} rx={900} ry={40} fill="#ffd89a" opacity={0.12} />
    </Layer>
    <FogPlane depth={0.7} color="#a06030" opacity={0.08} />
    {dark > 0 && <Layer depth={0.5}><rect x={-1200} y={-800} width={W + 2400} height={H + 1600} fill="#000" opacity={dark} /></Layer>}
  </>
);

/* =========================== P07: Ashoka speaks =========================== */
const sc7 = scene('p07_ashoka_line');
const Dictate: React.FC = () => {
  const t = useT();
  const vt = t - (sc7.vo ?? 0);
  const m = mouth('p07_ashoka_line', vt);
  const pose = talk(P.command, t, m.energy, 4);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, y: 20, f: 1}, {t: 7, z: 1.22, y: -60, f: 1}]} dof={8}>
        <Hall />
        <Layer depth={1}>
          <Puppet id="ash" L={{...ASHOKA, ambient: '#ffc890', ambientK: 0.12, rim: '#ffe0a8'}} outfit={ASHOKA_FIT} pose={pose} e={{...EX.resolve, open: m.open * 0.7, lookX: -0.3}} x={1080} y={1020} s={1.45} dir={-1} turn={0.35} seed={21} light={0.7} />
        </Layer>
        <Layer depth={1.35}>
          {[420, 760].map((x, i) => {
            const f = folk(20 + i);
            return <Puppet key={i} id={`scr${i}`} L={{...f.L, head: 'turban-plain', turbanColor: '#e8e0d0'}} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#c8a050'}} pose={{...P.write, rSh: -20, rEl: -100 + Math.sin(t * 11 + i) * 5, lSh: 30, lEl: -80, lean: 14}} e={{...EX.neutral, lookY: 0.8, lid: 0.55}} x={x} y={1080} s={1.4} turn={0.5} seed={30 + i} seated />;
          })}
          <Pothi x={600} y={1060} s={1.4} />
        </Layer>
      </Camera>
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};
const HearThem: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const vt = t + off - (sc7.vo ?? 0);
  const m = mouth('p07_ashoka_line', vt);
  const e = exprTrack([[0, {...EX.resolve, lookX: 0.6, lookY: -0.1}], [2.4, {...EX.serene, lid: 0.6, lookX: 0.6, smile: 0.15}, 1.0]], t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, x: -30, f: 1}, {t: 6, z: 1.12, x: 20, f: 1}]} dof={14} drift={0.4}>
        <Hall dark={0.2} />
        <Layer depth={1}>
          <Glow x={1500} y={300} r={700} color="#ffe0a8" opacity={0.3} />
          <Face id="ashcu" L={{...ASHOKA, outfit: 'royal', outfitColor: '#7a1e22', outfitColor2: '#4d1014', ambient: '#ffd0a0', ambientK: 0.15, rim: '#fff0d0', rimSide: 1, key: 0.8}} e={{...e, open: Math.max(e.open, m.open * 0.65)}} x={860} y={580} s={2.0} turn={0.3} tilt={m.energy * 2} seed={22} />
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
export const P07: React.FC = () => {
  const b = at(sc7, 'Let') - 0.4;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc7.dur} shots={[
        {from: 0, to: b, fadeIn: 0.4, render: () => <Dictate />},
        {from: b, to: sc7.dur, fadeIn: 0.4, render: (o) => <HearThem off={o} />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== P08: the history of the edicts =========================== */
const sc8 = scene('p08_history');
const Carvers: React.FC = () => {
  const t = useT();
  const strike = (seed: number) => Math.abs(Math.sin(t * 4 + seed));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.15, x: 60, f: 1}, {t: 7, z: 1.0, x: -40, f: 1}]} dof={7}>
        <Layer depth={0.04}><Sky id="cv" stops={[[0, '#5a7ab0'], [0.6, '#e8c8a0'], [1, '#fff0c8']]} /><Sun x={300} y={420} r={60} color="#fff6e0" glow="#ffd0a0" /></Layer>
        <Layer depth={0.25}><Ridge y={760} amp={70} color="#8a7a6a" seed={8} freq={0.002} /></Layer>
        <FogPlane depth={0.32} color="#f4d8b8" opacity={0.3} top={600} fade={0.1} />
        <Layer depth={1}>
          <rect x={-1000} y={960} width={W + 2000} height={600} fill="#7a6a4a" />
          <DhauliRock x={980} y={1000} s={1.4} c="#8a7e70" hi="#e0d0b8" glyphK={0} />
          {/* bamboo scaffold */}
          <path d="M 420 1000 L 440 440 M 560 1000 L 580 440 M 400 620 L 620 620" stroke="#6a4a2a" strokeWidth={10} />
          {[[470, 600, 1], [700, 990, 2]].map(([x, y, sd], i) => {
            const f = folk(42 + i * 3);
            return <Puppet key={i} id={`cv${i}`} L={f.L} outfit={f.fit} pose={{...P.stand, rSh: -120 + strike(sd) * 50, rEl: -30, rHand: 1, lSh: -70, lEl: -20, lHand: 1, lean: -4}} e={{...EX.stern, lookX: -0.6, lookY: -0.2}} x={x} y={y} s={0.95} dir={-1} turn={0.4} seed={40 + i} />;
          })}
        </Layer>
        <Layer depth={1.05}><Particles n={80} seed={5} color="#e8dcc8" size={[1, 3]} speed={[10, 30]} wind={-20} opacity={0.6} area={[300, 300, 700, 600]} /></Layer>
      </Camera>
      <Vignette strength={0.75} />
    </AbsoluteFill>
  );
};
const Today: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, x: -60, f: 1}, {t: 4, z: 1.06, x: 0, f: 1}]} dof={6}>
        <Layer depth={0.04}><Sky id="td" stops={[[0, '#6a9ad0'], [0.7, '#cfe2ec'], [1, '#f2ecd8']]} /></Layer>
        <Layer depth={0.3}><Ridge y={760} amp={60} color="#7a8a6a" seed={8} freq={0.002} /></Layer>
        <FogPlane depth={0.35} color="#e8eef0" opacity={0.3} top={600} fade={0.1} />
        <Layer depth={1}>
          <rect x={-1000} y={960} width={W + 2000} height={600} fill="#6a7a4a" />
          <DhauliRock x={980} y={1000} s={1.4} c="#5e5850" hi="#a8a090" />
          {/* moss, iron railing, a plaque, visitors */}
          {Array.from({length: 18}).map((_, i) => <ellipse key={i} cx={300 + rnd(i) * 1400} cy={700 + rnd(i * 3) * 280} rx={30 + rnd(i * 5) * 50} ry={10 + rnd(i * 7) * 14} fill="#4a6a2a" opacity={0.45} />)}
          {Array.from({length: 22}).map((_, i) => <line key={i} x1={220 + i * 70} y1={1000} x2={220 + i * 70} y2={900} stroke="#2a2a2e" strokeWidth={5} />)}
          <line x1={220} y1={910} x2={1690} y2={910} stroke="#2a2a2e" strokeWidth={6} /><line x1={220} y1={960} x2={1690} y2={960} stroke="#2a2a2e" strokeWidth={4} />
          <rect x={1720} y={820} width={140} height={90} fill="#2a4a6a" /><rect x={1786} y={910} width={8} height={90} fill="#2a2a2e" />
          {[0, 1].map((i) => { const f = folk(50 + i); return <Puppet key={i} id={`tour${i}`} L={f.L} outfit={{kind: 'modern', c1: ['#2a5a8a', '#c86a3a'][i], c2: '#1a1a22', c3: '#e8e0d0'}} pose={i ? P.point : P.stand} e={{...EX.awe, lookX: -0.4}} x={1400 + i * 160} y={1060} s={1.1} dir={-1} turn={0.4} seed={50 + i} />; })}
        </Layer>
      </Camera>
      <Caption t={t} a={0.6} b={4} x={150} y={H - 200} size={28} spacing={8}>DHAULI · TODAY</Caption>
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};
const Tishya: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const vt = t;
  const read = talk(P.hold, t, 0.8, 6);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.2, y: -120, f: 0.6}, {t: 7.5, z: 1.0, y: 0, f: 1}]} dof={8}>
        <Layer depth={0.03}>
          <Sky id="ts" stops={[[0, '#04050e'], [0.6, '#141a36'], [1, '#2a223a']]} />
          <Stars n={240} seed={9} />
          <circle cx={1500} cy={210} r={8} fill="#fff" /><Glow x={1500} y={210} r={120} color="#cfe0ff" opacity={0.6} />
          <text x={1530} y={190} fontFamily={CINZEL} fontSize={18} letterSpacing={4} fill="#cfe0ff" opacity={ramp(t, 3, 4)}>TISHYA</text>
        </Layer>
        <Layer depth={0.3}><Ridge y={760} amp={50} color="#0c0e18" seed={3} freq={0.002} /></Layer>
        <Layer depth={0.6}>
          <rect x={-1000} y={880} width={W + 2000} height={600} fill="#1a120c" />
          <DhauliRock x={1100} y={900} s={0.9} c="#2a2420" hi="#6a5a4a" glyphK={0.5} />
          {[600, 1500].map((x, i) => <g key={i}><rect x={x - 5} y={760} width={10} height={140} fill="#2a1408" /><Flame x={x} y={760} s={1.3} seed={i + 3} /></g>)}
        </Layer>
        <Layer depth={0.8}>
          <Crowd n={30} y={1010} spread={60} s={0.62} seed={14} speed={0} still={1} turnTo={-0.4} standing={1} dim="#ffb070" dimK={0.25} />
        </Layer>
        <Layer depth={1}>
          <rect x={160} y={900} width={340} height={70} fill="#3a2414" />
          <Puppet id="officer" L={{...folk(60).L, head: 'turban-plain', turbanColor: '#efe8d8'}} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#e8c27a'}} pose={read} e={{...EX.stern, open: Math.max(0, Math.sin(t * 9)) * 0.45, lookX: 0.5}} x={330} y={905} s={1.15} turn={0.4} seed={61} light={0.7} />
          <rect x={300} y={540} width={120} height={14} rx={6} fill="#d8b878" />
        </Layer>
      </Camera>
      <Caption t={t} a={2} b={7.5} x={0} align="center" y={H - 200} size={24} spacing={6} font={CORM} color="#f0e0c0">“This edict must be listened to on the day of Tishya.” — Separate Kalinga Edict</Caption>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
const Officers: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, x: 0, f: 1}, {t: 7, x: 900, f: 1}]} dof={7}>
        <Layer depth={0.03}><Sky id="of" stops={[[0, '#6a9ad0'], [0.6, '#f0d8a8'], [1, '#ffeec8']]} /><Sun x={1600} y={460} r={60} color="#fff6e0" glow="#ffd0a0" /><Clouds y={260} color="#fff4e0" seed={4} opacity={0.5} /></Layer>
        <Layer depth={0.2}><Ridge y={720} amp={80} color="#a89a8a" seed={13} freq={0.0015} x1={W + 3000} /></Layer>
        <FogPlane depth={0.28} color="#f8e8d0" opacity={0.3} top={560} fade={0.1} />
        <Layer depth={0.45}>
          <rect x={-1000} y={780} width={W + 4000} height={600} fill="#b8a060" />
          {Array.from({length: 7}).map((_, i) => <Hut key={i} x={-200 + i * 520} y={820} s={0.55} wall={['#a8704a', '#9a6040', '#b0805a'][i % 3]} roof="#7a6a3a" />)}
          {Array.from({length: 6}).map((_, i) => <Palm key={i} x={60 + i * 640} y={830} h={380} color="#4a5a2a" seed={i} />)}
        </Layer>
        <FogPlane depth={0.55} color="#f8e8d0" opacity={0.12} />
        <Layer depth={0.8}>
          <rect x={-1000} y={930} width={W + 4000} height={600} fill="#9a7a48" />
          <path d={`M -1000 1000 L ${W + 3000} 1000`} stroke="#c8a870" strokeWidth={60} />
          {[0, 1].map((i) => <g key={i} transform={`translate(${200 + t * 140 + i * 260}, 0)`}><Rider x={0} y={1010} s={0.9} color={['#3a2a1a', '#2a1e14'][i]} turban /></g>)}
          {[0, 1, 2].map((i) => { const f = folk(70 + i); return <Puppet key={i} id={`ofw${i}`} L={{...f.L, head: 'turban-plain', turbanColor: '#efe8d8'}} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#e8c27a'}} pose={walk({...P.hold, lSh: 0, lEl: 0}, t * 5 + i, 0.8)} e={EX.neutral} x={-100 + t * 120 + i * 140} y={1030} s={0.8} turn={0.5} seed={70 + i} />; })}
        </Layer>
        <Layer depth={1.4}>
          {Array.from({length: 8}).map((_, i) => <path key={i} d={`M ${i * 500 - 400} 1200 q 40 -260 90 -330 q 20 120 10 330 Z`} fill="#3a4a1a" />)}
        </Layer>
      </Camera>
      <Caption t={t} a={0.6} b={6.5} x={150} y={H - 200} size={26} spacing={6}>DHAMMA MAHAMATTAS</Caption>
      <Caption t={t} a={1.0} b={6.5} x={152} y={H - 162} size={22} spacing={3} font={CORM} color="#f0e0c0">Officers of Dhamma, appointed in the 13th year of Ashoka’s reign</Caption>
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};
const LastPillar: React.FC = () => {
  const t = useT();
  const glow = ramp(t, 1.4, 3.4);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, y: 160, z: 1.1}, {t: 4.5, y: -420, z: 0.9}]}>
        <Layer depth={0.04}><Sky id="lp" stops={[[0, '#1a1a40'], [0.5, '#a04a5a'], [0.8, '#f08a4a'], [1, '#ffc87a']]} /><Sun x={1400} y={760} r={110} color="#fff0d0" glow="#ff9a4a" /></Layer>
        <Layer depth={0.3}><Ridge y={900} amp={50} color="#5a2a3a" seed={2} freq={0.002} /></Layer>
        <Layer depth={1}>
          <Pillar x={900} y={1300} h={1000} w={150} color="#7a5a3a" hi="#ffd8a0" lion />
          <path d="M 930 1300 L 950 300 L 960 300 L 960 1300 Z" fill="#000" opacity={0.25} />
          <g opacity={glow}>
            {Array.from({length: 9}).map((_, r) => <path key={r} d={`M 860 ${700 + r * 30} l 80 0`} stroke="#ffcf7a" strokeWidth={4} strokeDasharray="10 6" style={{filter: 'drop-shadow(0 0 6px #ffb347)'}} />)}
          </g>
          <rect x={-400} y={1150} width={W + 800} height={400} fill="#3a2a2a" />
        </Layer>
      </Camera>
      <Caption t={t} a={1.6} b={4.4} x={150} y={H - 200} size={24} spacing={6}>PILLAR EDICT VII</Caption>
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};
const RulesVsPersuasion: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tR = at(sc8, 'rules...') - off, tP = at(sc8, 'persuasion.') - off, tW = at(sc8, 'persuasion', 2) - off;
  const lit = ramp(t, tW - 0.4, tW + 1.2);
  const g = folk(80), st = folk(82);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* RULES */}
      <div style={{position: 'absolute', left: 0, top: 0, width: W / 2, height: H, overflow: 'hidden', opacity: ramp(t, 0.2, 0.9) * (0.35 + 0.65 * ramp(t, tR - 0.6, tR)) * (1 - lit * 0.55), filter: `saturate(${1 - lit * 0.7})`}}>
        <svg width={W} height={H} viewBox={`${W / 4} 0 ${W} ${H}`} style={{position: 'absolute', left: -W / 4, width: W, height: H}}>
          <rect width={W * 2} height={H} fill="#1c2638" />
          <rect x={600} y={260} width={720} height={700} fill="#2a3448" />
          {Array.from({length: 12}).map((_, i) => <line key={i} x1={640 + i * 56} y1={300} x2={640 + i * 56} y2={960} stroke="#0e1420" strokeWidth={10} />)}
          <Puppet id="guard" L={{...g.L, head: 'turban-plain', turbanColor: '#5a1a1a'}} outfit={{kind: 'dhoti', c1: '#8a6a4a', c2: '#5a1a1a'}} pose={{...P.stand, rSh: -10, rEl: -150, rHand: 1}} e={{...EX.stern, lookX: 0.4}} x={760} y={1040} s={1.2} turn={0.4} seed={81} />
          <line x1={720} y1={1000} x2={700} y2={500} stroke="#2a1a10" strokeWidth={6} />
          {[1060, 1220].map((x, i) => { const f = folk(84 + i); return <Puppet key={i} id={`rv${i}`} L={f.L} outfit={f.fit} pose={P.cower} e={{...EX.troubled, lookX: -0.5}} x={x} y={1040} s={1.0} dir={-1} turn={0.4} seed={84 + i} />; })}
        </svg>
        <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: CINZEL, fontSize: 52, letterSpacing: 16, color: '#cfe0ff'}}>RULES</div>
      </div>
      {/* PERSUASION */}
      <div style={{position: 'absolute', left: W / 2, top: 0, width: W / 2, height: H, overflow: 'hidden', opacity: ramp(t, 0.2, 0.9) * (0.35 + 0.65 * ramp(t, tP - 0.6, tP))}}>
        <svg width={W} height={H} viewBox={`${W / 4} 0 ${W} ${H}`} style={{position: 'absolute', left: -W / 4, width: W, height: H}}>
          <rect width={W * 2} height={H} fill={mixColor('#5a3018', '#8a5020', lit)} />
          <Glow x={960} y={700} r={700} color="#ffb347" opacity={0.4 + lit * 0.3} />
          <Puppet id="story" L={st.L} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#c8502a'}} pose={talk(P.raise, t, 1, 9)} e={{...EX.proud, open: Math.max(0, Math.sin(t * 8)) * 0.45, smile: 0.4}} x={960} y={1040} s={1.25} turn={0.1} seed={82} />
          {[640, 780, 1140, 1290].map((x, i) => { const f = folk(90 + i); return <Puppet key={i} id={`pv${i}`} L={f.L} outfit={f.fit} pose={{...P.listen, lean: (x < 960 ? 1 : -1) * 8}} e={{...EX.awe, smile: 0.3 * lit, lookX: x < 960 ? 0.6 : -0.6}} x={x} y={1070} s={0.95} dir={x < 960 ? 1 : -1} turn={0.5} seed={90 + i} />; })}
        </svg>
        <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: CINZEL, fontSize: 52, letterSpacing: 16, color: '#ffe2b0', textShadow: `0 0 ${lit * 30}px #ffb347`}}>PERSUASION</div>
      </div>
      <div style={{position: 'absolute', left: W / 2 - 2, top: 0, width: 4, height: H, background: '#000', opacity: 1 - lit}} />
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};
export const P08: React.FC = () => {
  const b = [at(sc8, 'Some') - 0.3, atPhrase(sc8, 'At Kalinga') - 0.3, atPhrase(sc8, 'He appointed') - 0.4, atPhrase(sc8, 'And on one') - 0.3, at(sc8, 'People') - 0.4];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc8.dur} shots={[
        {from: 0, to: b[0], fadeIn: 0.5, render: () => <Carvers />},
        {from: b[0], to: b[1], fadeIn: 0.8, render: () => <Today />},
        {from: b[1], to: b[2], fadeIn: 0.7, render: (o) => <Tishya off={o} />},
        {from: b[2], to: b[3], fadeIn: 0.6, render: () => <Officers />},
        {from: b[3], to: b[4], fadeIn: 0.6, render: () => <LastPillar />},
        {from: b[4], to: sc8.dur, fadeIn: 0.5, render: (o) => <RulesVsPersuasion off={o} />},
      ]} />
    </AbsoluteFill>
  );
};
