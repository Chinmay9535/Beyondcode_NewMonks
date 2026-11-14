import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {Shots} from '../lib/shots';
import {W, H, scene, at, atPhrase, ramp, useT, clamp, lerp, rnd, easeOut, easeInOut, easeIn, mixColor, noise1} from '../lib/util';
import {Glow, Vignette, Black, Particles, Smoke, GodRays, Flame, Caption, CINZEL, CORM} from '../lib/fx';
import {Sky, Sun, Ridge, Stars, CitySkyline, IndiaMap, proj, SeatedHood, Pothi, Chakra} from '../lib/sets';
import {Face, exprTrack, EX} from '../chars/face';
import {Puppet, P, walk, talk} from '../chars/puppet';
import {KEEPER, NINE, folk} from '../chars/cast2';
import {FogPlane, Crowd, Lantern, Stall} from '../lib/sets2';
import {Eye, RedBook, Lamp} from './common';
import CREDITS from '../credits.json';

const modern = (i: number) => {
  const f = folk(200 + i);
  const woman = i % 3 === 1;
  return {L: {...f.L, head: (woman ? 'hair-bun' : 'side-part') as any, mark: 'none' as any, turbanColor: undefined}, fit: {kind: 'modern' as const, c1: ['#2a5a8a', '#c86a3a', '#3a3a42', '#8a2a4a', '#2a7a5a', '#e8e0d0'][i % 6], c2: '#1a1a22', c3: '#e8e0d0'}};
};

/* =========================== P10: through the ages =========================== */
const sc10 = scene('p10_ages');
const Sealed: React.FC = () => {
  const t = useT();
  const lid = ramp(t, 2.6, 4.2, easeInOut);
  return (
    <AbsoluteFill style={{background: '#030202'}}>
      <Camera keys={[{t: 0, z: 1.2, y: 40, f: 1}, {t: 5, z: 1.0, y: 0, f: 1}]} dof={8}>
        <Layer depth={0.6}>
          <rect x={-800} y={-600} width={W + 1600} height={H + 1600} fill="#100a08" />
          {Array.from({length: 9}).map((_, i) => <g key={i} opacity={0.9}><SeatedHood x={200 + i * 190} y={760} s={0.9} color="#0a0606" rim={NINE[i].color} rimSide={i < 4 ? 1 : -1} breathe={i} /></g>)}
          <Glow x={960} y={760} r={700} color="#ff6a3a" opacity={0.25} />
        </Layer>
        <Layer depth={1}>
          {/* stone chest */}
          <rect x={620} y={760} width={680} height={260} fill="#4a4440" />
          <rect x={620} y={760} width={680} height={40} fill="#5a544c" />
          <RedBook x={960} y={780} s={0.8} glow={1 - lid} />
          <g transform={`translate(0, ${-(1 - lid) * 320})`} opacity={lid > 0 ? 1 : 0}>
            <rect x={600} y={700} width={720} height={70} fill="#5e5852" />
            <Chakra x={960} y={735} r={26} color="#2a2420" sw={2} />
          </g>
          {lid > 0.95 && <Particles n={60} seed={101} color="#b8b0a0" size={[1.5, 4]} speed={[-10, -30]} wind={30} opacity={1 - ramp(t, 4.2, 5.2)} area={[600, 680, 720, 120]} />}
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
const Tunnel: React.FC = () => {
  const t = useT();
  const year = Math.round(lerp(-230, 1900, ramp(t, 0.4, 7.2, easeIn)));
  const pages = Array.from({length: 70}).map((_, i) => {
    const z = ((rnd(i) + t * 0.35) % 1);
    const a = rnd(i * 3) * Math.PI * 2 + t * 0.4;
    const r = 80 + z * z * 1300;
    const s = 0.2 + z * 1.6;
    return <g key={i} transform={`translate(${960 + Math.cos(a) * r}, ${540 + Math.sin(a) * r * 0.65}) rotate(${a * 57 + t * 30}) scale(${s})`} opacity={clamp(z * 3) * (1 - z * 0.3)}><rect x={-60} y={-24} width={120} height={48} rx={6} fill="#d8b878" />{[0, 1, 2].map((k) => <line key={k} x1={-46} y1={-12 + k * 12} x2={40} y2={-12 + k * 12} stroke="#7a1a10" strokeWidth={3} strokeDasharray="8 5" />)}</g>;
  });
  return (
    <AbsoluteFill style={{background: '#0a0402'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <Glow x={960} y={540} r={500} color="#ff7a3a" opacity={0.6} />
        {pages}
        <Eye x={960} y={540} r={90} glow={0.8} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: H - 230, textAlign: 'center', fontFamily: CINZEL, fontSize: 60, letterSpacing: 12, color: '#f2d6a0', textShadow: '0 0 30px #000'}}>{year < 0 ? `${-year} BCE` : `${year} CE`}</div>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
/** quick vignettes: each a different era of mass persuasion */
const Era: React.FC<{kind: 'crier' | 'press' | 'posters' | 'radio' | 'screens'}> = ({kind}) => {
  const t = useT();
  if (kind === 'crier') {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Camera keys={[{t: 0, z: 1.1, x: -50, f: 1}, {t: 2, z: 1.0, x: 30, f: 1}]} dof={7}>
          <Layer depth={0.04}><Sky id="cr" stops={[[0, '#8ab0d0'], [1, '#f0e0c0']]} /></Layer>
          <Layer depth={0.4}><CitySkyline y={760} color="#a08a70" seed={51} scale={0.9} /></Layer>
          <FogPlane depth={0.45} color="#f0e0c0" opacity={0.25} />
          <Layer depth={0.8}><rect x={-1000} y={880} width={W + 2000} height={600} fill="#a8885a" /><Crowd n={16} y={980} spread={50} s={0.7} seed={61} speed={0} standing={1} still={1} turnTo={0.3} lod={0} /></Layer>
          <Layer depth={1}>
            <Puppet id="crier" L={{...folk(63).L, head: 'turban-plain', turbanColor: '#c8322a'}} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#c8322a'}} pose={{...P.stand, rSh: -120 + Math.abs(Math.sin(t * 8)) * 40, rEl: -20, rHand: 1, lSh: 30, lEl: -60}} e={{...EX.roar, open: 0.5 + Math.sin(t * 6) * 0.2, lookX: 0}} x={1300} y={1030} s={1.3} turn={0.1} seed={63} prop="drum" />
          </Layer>
        </Camera>
        <Caption t={t + 1} a={0} b={99} x={150} y={H - 200} size={26} spacing={8}>THE TOWN CRIER</Caption>
        <Vignette strength={0.75} />
      </AbsoluteFill>
    );
  }
  if (kind === 'press') {
    const press = Math.abs(Math.sin(t * 5));
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Camera keys={[{t: 0, z: 1.05, f: 1}, {t: 2, z: 1.12, f: 1}]} dof={7} shake={press > 0.95 ? 3 : 0}>
          <Layer depth={0.5}><rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#3a2a1c" /><Glow x={900} y={300} r={700} color="#ffd89a" opacity={0.3} /></Layer>
          <Layer depth={1}>
            <rect x={640} y={300} width={60} height={700} fill="#2a2a2e" /><rect x={1220} y={300} width={60} height={700} fill="#2a2a2e" />
            <rect x={600} y={260} width={720} height={70} fill="#3a3a40" />
            <rect x={700} y={420 + press * 160} width={520} height={60} fill="#4a4a52" />
            <line x1={960} y1={330} x2={960} y2={420 + press * 160} stroke="#2a2a2e" strokeWidth={30} />
            <rect x={660} y={760} width={600} height={60} fill="#5a5048" />
            {Array.from({length: 26}).map((_, i) => {
              const ph = (t * 0.9 + i / 26) % 1;
              return <g key={i} transform={`translate(${960 + (rnd(i) - 0.5) * 300 + ph * (rnd(i * 3) - 0.5) * 1800}, ${700 - ph * 900 + ph * ph * 1300}) rotate(${ph * 400 * (rnd(i * 5) - 0.5)})`} opacity={1 - ph * 0.5}><rect x={-50} y={-34} width={100} height={68} fill="#f0e8d8" /><Eye x={0} y={-6} r={20} /></g>;
            })}
          </Layer>
        </Camera>
        <Caption t={t + 1} a={0} b={99} x={150} y={H - 200} size={26} spacing={8}>THE PRINTING PRESS</Caption>
        <Vignette strength={0.75} />
      </AbsoluteFill>
    );
  }
  if (kind === 'posters') {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Camera keys={[{t: 0, x: -200, f: 1}, {t: 2.2, x: 200, f: 1}]} dof={7}>
          <Layer depth={1}>
            <rect x={-1000} y={-600} width={W + 2000} height={H + 1200} fill="#8a7a6a" />
            {Array.from({length: 34}).map((_, i) => {
              const x = -700 + (i % 11) * 300 + rnd(i) * 40, y = 140 + Math.floor(i / 11) * 280 + rnd(i * 3) * 30;
              const c = ['#c8322a', '#1a1a1a', '#e8c25a', '#2a4a7a'][i % 4];
              return <g key={i} transform={`translate(${x},${y}) rotate(${(rnd(i * 5) - 0.5) * 6})`}><rect x={-120} y={-120} width={240} height={250} fill="#efe6d4" /><rect x={-120} y={-120} width={240} height={70} fill={c} /><Eye x={0} y={30} r={60} color={c} /><rect x={-90} y={100} width={180} height={12} fill={c} /></g>;
            })}
          </Layer>
          <Layer depth={1.3}>{Array.from({length: 3}).map((_, i) => { const m = modern(i + 10); return <Puppet key={i} id={`pw${i}`} L={{...m.L, head: 'none'}} outfit={{kind: 'dhoti', c1: '#3a3a40', c2: '#5a5a62'}} pose={walk(P.stand, t * 5 + i, 0.8)} e={{...EX.neutral, lookX: -0.8}} x={300 + i * 700 + t * 200} y={1140} s={1.4} turn={0.5} seed={210 + i} lod={0} />; })}</Layer>
        </Camera>
        <Caption t={t + 1} a={0} b={99} x={150} y={H - 200} size={26} spacing={8}>POSTERS ON EVERY WALL</Caption>
        <Vignette strength={0.75} />
      </AbsoluteFill>
    );
  }
  if (kind === 'radio') {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Camera keys={[{t: 0, z: 1.0, f: 1}, {t: 2.5, z: 1.1, f: 1}]} dof={8}>
          <Layer depth={0.5}><rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#2a1c14" /><Glow x={960} y={600} r={700} color="#ffb060" opacity={0.35} /></Layer>
          <Layer depth={1}>
            {/* the radio */}
            <g transform="translate(960, 620)">
              <path d="M -160 120 L -160 -60 Q -160 -160 0 -170 Q 160 -160 160 -60 L 160 120 Z" fill="#6a3a1a" />
              <path d="M -120 -40 Q -120 -120 0 -126 Q 120 -120 120 -40 L 120 20 L -120 20 Z" fill="#c8a868" />
              {Array.from({length: 8}).map((_, i) => <line key={i} x1={-100 + i * 28} y1={-110} x2={-100 + i * 28} y2={10} stroke="#6a3a1a" strokeWidth={4} />)}
              <circle cx={-60} cy={70} r={18} fill="#2a1408" /><circle cx={60} cy={70} r={18} fill="#2a1408" />
              {[0, 1, 2].map((k) => { const ph = (t * 0.8 + k / 3) % 1; return <path key={k} d={`M ${-140 - ph * 160} -60 Q ${-200 - ph * 200} 0 ${-140 - ph * 160} 60 M ${140 + ph * 160} -60 Q ${200 + ph * 200} 0 ${140 + ph * 160} 60`} stroke="#ffe2a0" strokeWidth={3} fill="none" opacity={1 - ph} />; })}
            </g>
            {[[440, 0], [700, 1], [1240, 2], [1480, 3]].map(([x, i]) => { const f = folk(220 + i); return <Puppet key={i} id={`rd${i}`} L={{...f.L, ambient: '#ffb060', ambientK: 0.2}} outfit={f.fit} pose={P.listen} e={{...EX.awe, lookX: x < 960 ? 0.8 : -0.8}} x={x} y={1080} s={1.05} dir={x < 960 ? 1 : -1} turn={0.5} seed={220 + i} seated />; })}
          </Layer>
        </Camera>
        <Caption t={t + 1} a={0} b={99} x={150} y={H - 200} size={26} spacing={8}>A VOICE ON THE RADIO</Caption>
        <Vignette strength={0.8} />
      </AbsoluteFill>
    );
  }
  // screens
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.15, f: 1}, {t: 5, z: 1.0, f: 1}]} dof={8}>
        <Layer depth={0.05}><Sky id="sc" stops={[[0, '#04040c'], [1, '#141a30']]} /></Layer>
        <Layer depth={0.3}><CitySkyline y={760} color="#0a0c18" seed={71} scale={1.4} window="#8ac8ff" /></Layer>
        <FogPlane depth={0.4} color="#1a2040" opacity={0.3} />
        <Layer depth={0.8}><rect x={-1000} y={900} width={W + 2000} height={600} fill="#0c0e18" /></Layer>
        <Layer depth={1}>
          {Array.from({length: 9}).map((_, i) => {
            const m = modern(i);
            return <Puppet key={i} id={`ph${i}`} L={{...m.L, ambient: '#5a8aff', ambientK: 0.35}} outfit={m.fit} pose={{...P.stand, lSh: 20, lEl: -125, lHand: 1, headTilt: 14}} e={{...EX.neutral, lookY: 0.9, lid: 0.6}} x={140 + i * 210} y={1040 + (i % 2) * 30} s={0.95} turn={0.3} seed={230 + i} prop="phone" lod={i % 2 ? 0 : 1} />;
          })}
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
export const P10: React.FC = () => {
  const b = [atPhrase(sc10, 'And yet') - 0.3, atPhrase(sc10, 'The town') - 0.15, atPhrase(sc10, 'The printing') - 0.15, at(sc10, 'Posters') - 0.15, atPhrase(sc10, 'A voice') - 0.15, atPhrase(sc10, 'And then...') - 0.2];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc10.dur} shots={[
        {from: 0, to: b[0], fadeIn: 0.6, render: () => <Sealed />},
        {from: b[0], to: b[1], fadeIn: 0.5, render: () => <Tunnel />},
        {from: b[1], to: b[2], fadeIn: 0.15, render: () => <Era kind="crier" />},
        {from: b[2], to: b[3], fadeIn: 0.15, render: () => <Era kind="press" />},
        {from: b[3], to: b[4], fadeIn: 0.15, render: () => <Era kind="posters" />},
        {from: b[4], to: b[5], fadeIn: 0.15, render: () => <Era kind="radio" />},
        {from: b[5], to: sc10.dur, fadeIn: 0.6, render: () => <Era kind="screens" />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== P11: now =========================== */
const sc11 = scene('p11_now');
const ModernMarket: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tH = at(sc11, 'hands.') - off;
  const people = Array.from({length: 14}).map((_, i) => ({i, x: (rnd(i) * 2400 + t * (20 + rnd(i * 3) * 30) * (i % 2 ? 1 : -1)) % 2400 - 240, y: 960 + rnd(i * 5) * 90})).sort((a, b) => a.y - b.y);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, y: -40, f: 0.9}, {t: tH - 0.6, z: 1.08, y: 0, f: 0.9}, {t: tH + 1.5, z: 1.5, y: 120, f: 1.3}]} dof={9}>
        <Layer depth={0.04}><Sky id="mm" stops={[[0, '#05060f'], [1, '#1a1a36']]} /></Layer>
        <Layer depth={0.15}><CitySkyline y={640} color="#0a0a16" seed={81} scale={1.6} window="#8ac8ff" /></Layer>
        <FogPlane depth={0.2} color="#1a1a36" opacity={0.35} />
        <Layer depth={0.45}>
          <rect x={-1500} y={780} width={W + 3000} height={700} fill="#1a1418" />
          {Array.from({length: 8}).map((_, i) => <Stall key={i} x={-600 + i * 420} y={800} s={0.6} c1={['#2a6aaa', '#c8322a', '#e8a02a'][i % 3]} c2="#f0f0f0" goods={i % 3} seed={i} light="#e8f4ff" />)}
          {Array.from({length: 12}).map((_, i) => <circle key={i} cx={-300 + i * 220} cy={420 + Math.sin(i) * 20} r={6} fill={['#ff3a8a', '#2ad8e8', '#ffb02a'][i % 3]} style={{filter: `drop-shadow(0 0 8px ${['#ff3a8a', '#2ad8e8', '#ffb02a'][i % 3]})`}} />)}
        </Layer>
        <Layer depth={1}>
          {people.map(({i, x, y}) => { const m = modern(i); return <Puppet key={i} id={`mm${i}`} L={{...m.L, ambient: '#6a8aff', ambientK: 0.3}} outfit={m.fit} pose={walk({...P.stand, lSh: 20, lEl: -125, lHand: 1, headTilt: 12}, t * 5 + i, 0.7)} e={{...EX.neutral, lookY: 0.9, lid: 0.6}} x={x} y={y} s={0.9} dir={i % 2 ? 1 : -1} turn={0.4} seed={240 + i} prop="phone" lod={0} />; })}
        </Layer>
        <Layer depth={1.3}>
          {/* a hand holding a phone that shows the market */}
          <g opacity={ramp(t, tH - 1.2, tH - 0.4)} transform="translate(980, 760)">
            <path d="M -260 400 C -200 200 -120 120 -60 100 L 120 100 C 160 140 180 260 200 400 Z" fill="#8a5a3c" />
            <rect x={-150} y={-260} width={300} height={560} rx={36} fill="#0a0a10" />
            <rect x={-134} y={-240} width={268} height={520} rx={24} fill="#1a2440" />
            <g clipPath="url(#scr)"><defs><clipPath id="scr"><rect x={-134} y={-240} width={268} height={520} rx={24} /></clipPath></defs>
              {Array.from({length: 6}).map((_, i) => <rect key={i} x={-120} y={-220 + i * 86 - ((t * 60) % 86)} width={240} height={74} rx={10} fill={['#2a3a6a', '#3a2a5a', '#2a4a5a'][i % 3]} />)}
              <Lantern x={0} y={-60} s={1.2} seed={3} />
            </g>
            <path d="M -170 160 C -200 120 -200 60 -160 40 L -130 60 Z" fill="#8a5a3c" />
          </g>
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
const Billion: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tB = at(sc11, 'billion') - off;
  const spread = ramp(t, 0.4, tB + 0.6, easeIn);
  const k = 24, ox = 528, oy = 120;
  const [cx, cy] = proj(77.2, 28.6, k, ox, oy);
  const dots = Array.from({length: 600}).map((_, i) => {
    const lon = 68 + rnd(i) * 22, la = 8 + rnd(i * 3) * 26;
    const [x, y] = proj(lon, la, k, ox, oy);
    const d = Math.hypot(x - cx, y - cy);
    return d < spread * 900 ? <circle key={i} cx={x} cy={y} r={2.5} fill="#8ad8ff" opacity={0.85} /> : null;
  });
  return (
    <AbsoluteFill style={{background: '#02040a'}}>
      <Camera keys={[{t: 0, z: 1.2}, {t: 4, z: 1.0}]} drift={0.3}>
        <Layer depth={1}>
          <IndiaMap k={k} ox={ox} oy={oy} fill={0} kalinga={0} land="#0a1020" empire="#0a1020" kalingaColor="#0a1020" line="#2a4a7a" />
          {dots}
          <circle cx={cx} cy={cy} r={spread * 900} fill="none" stroke="#8ad8ff" strokeWidth={2} opacity={0.4} />
          <Glow x={cx} y={cy} r={200} color="#8ad8ff" opacity={0.5} />
        </Layer>
      </Camera>
      <div style={{position: 'absolute', left: 0, right: 0, top: H - 240, textAlign: 'center', fontFamily: CINZEL, fontSize: 56, letterSpacing: 6, color: '#cfe8ff', textShadow: '0 0 20px #2a6aff'}}>{Math.floor(Math.pow(spread, 3) * 1_000_000_000).toLocaleString('en-US')}</div>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
const Feed: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tN = at(sc11, 'never') - off;
  const hide = ramp(t, tN - 0.8, tN + 0.6);
  return (
    <AbsoluteFill style={{background: '#06060c'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {Array.from({length: 3}).map((_, col) => Array.from({length: 8}).map((_, r) => {
          const i = col * 8 + r;
          const y = -200 + r * 260 - ((t * 140 + col * 80) % 260);
          const dim = rnd(i * 3) > 0.5 ? hide : 0;
          const c = ['#c8322a', '#2a6aaa', '#e8a02a', '#2a8a5a', '#8a2a8a'][i % 5];
          return (
            <g key={i} transform={`translate(${520 + col * 320}, ${y})`} opacity={1 - dim * 0.92}>
              <rect x={0} y={0} width={290} height={230} rx={18} fill="#14141e" />
              <rect x={14} y={14} width={262} height={130} rx={10} fill={c} opacity={0.75} />
              <circle cx={40} cy={180} r={18} fill="#3a3a4a" />
              <rect x={70} y={168} width={170} height={10} rx={5} fill="#3a3a4a" />
              <rect x={70} y={188} width={120} height={10} rx={5} fill="#2a2a3a" />
            </g>
          );
        }))}
      </svg>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #06060c 0%, rgba(6,6,12,0) 25%, rgba(6,6,12,0) 75%, #06060c 100%)'}} />
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
const Pocket: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tP = at(sc11, 'pocket.') - off;
  const end = sc11.dur - off;
  const flick = noise1(t * 12, 3) > 0.35 ? 1 : 0.3;
  const eye = ramp(t, 1.0, 2.0) * flick;
  const slide = ramp(t, tP - 0.3, tP + 1.0, easeIn);
  return (
    <AbsoluteFill style={{background: '#020204'}}>
      <Camera keys={[{t: 0, z: 1.1}, {t: end, z: 1.25}]} drift={0.4}>
        <Layer depth={1}>
          <g transform={`translate(960, ${560 + slide * 900})`}>
            <Glow x={0} y={0} r={600} color={eye > 0.5 ? '#ff3a2a' : '#4a8aff'} opacity={0.35} />
            <path d="M -320 520 C -260 260 -160 200 -80 180 L 160 180 C 210 230 230 360 250 520 Z" fill="#7a4e34" />
            <rect x={-170} y={-300} width={340} height={640} rx={40} fill="#0a0a10" />
            <rect x={-152} y={-280} width={304} height={600} rx={28} fill={mixColor('#1a2440', '#2a0606', eye)} />
            <Eye x={0} y={20} r={110} open={0.4 + 0.6 * eye} glow={eye} look={Math.sin(t * 1.5) * 0.6} />
            <path d="M -190 240 C -230 190 -230 120 -180 100 L -150 130 Z" fill="#7a4e34" />
          </g>
          {/* pocket edge */}
          <path d="M 300 1180 Q 960 1040 1620 1180 L 1620 1400 L 300 1400 Z" fill="#14141c" opacity={slide} />
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
      <Black o={ramp(t, end - 0.8, end)} />
    </AbsoluteFill>
  );
};
export const P11: React.FC = () => {
  const b = [at(sc11, 'Today,') - 0.3, atPhrase(sc11, 'A feed') - 0.3, atPhrase(sc11, 'If the first') - 0.3];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc11.dur} shots={[
        {from: 0, to: b[0], fadeIn: 0.6, render: (o) => <ModernMarket off={o} />},
        {from: b[0], to: b[1], fadeIn: 0.5, render: (o) => <Billion off={o} />},
        {from: b[1], to: b[2], fadeIn: 0.5, render: (o) => <Feed off={o} />},
        {from: b[2], to: sc11.dur, fadeIn: 0.6, render: (o) => <Pocket off={o} />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== P12: the second book =========================== */
const sc12 = scene('p12_tease');
export const P12: React.FC = () => {
  const t = useT();
  const tB = at(sc12, 'body.');
  const tT = at(sc12, 'touch');
  const end = sc12.dur;
  const n = NINE[1];
  const e = exprTrack([[0, {...EX.closed, smile: 0}], [tB - 1.2, {...EX.stern, lookY: 0.2}, 0.8], [tT - 0.2, {...EX.stern, lid: 1.0, browIn: -14, lookY: 0}, 0.3]], t);
  const touch = ramp(t, tT + 0.2, tT + 1.2);
  return (
    <AbsoluteFill style={{background: '#020303'}}>
      <Camera keys={[{t: 0, z: 1.0, f: 1}, {t: end, z: 1.25, y: -20, f: 1}]} dof={10} drift={0.4}>
        <Layer depth={0.6}>
          <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#040808" />
          <Glow x={960} y={600} r={800} color={n.color} opacity={0.15 + touch * 0.2} />
          {Array.from({length: 9}).map((_, i) => <SeatedHood key={i} x={160 + i * 200} y={1000} s={0.9} color="#050707" rim={i === 4 ? n.color : '#3a3a3a'} breathe={i} />)}
        </Layer>
        <Layer depth={1}>
          <Face id="keeper2" L={{...n.look, ambient: '#3a6a64', ambientK: 0.45, rim: n.color, rimSide: 1, key: 0.8, hi: '#a8f0e0'}} e={e} x={960} y={560} s={2.0} seed={12} />
          {/* two fingers touch a point; the ripple */}
          <g opacity={ramp(t, tT - 0.6, tT)} transform={`translate(${1380 - ramp(t, tT - 0.6, tT + 0.2) * 120}, 820)`}>
            <path d="M 0 0 L 80 -20 L 260 -10 L 260 40 L 70 40 Z" fill="#7c4a2c" />
            <rect x={-60} y={-14} width={80} height={16} rx={8} fill="#7c4a2c" /><rect x={-50} y={8} width={70} height={16} rx={8} fill="#7c4a2c" />
          </g>
          {touch > 0 && [0, 1, 2].map((k) => <circle key={k} cx={1260} cy={820} r={(touch * 400 + k * 60) % 460} fill="none" stroke={n.color} strokeWidth={3} opacity={(1 - touch) * 0.9} />)}
        </Layer>
      </Camera>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, #000 100%)'}} />
      <Vignette strength={0.9} />
      <Black o={t > end - 1.3 ? 1 : 0} />
    </AbsoluteFill>
  );
};

/* =========================== P13: end card =========================== */
export const P13: React.FC = () => {
  const t = useT();
  const a = ramp(t, 0.3, 1.4), b = ramp(t, 1.3, 2.5), c = ramp(t, 2.8, 3.8);
  const out = 1 - ramp(t, 6.8, 7.5);
  return (
    <AbsoluteFill style={{background: '#030303', opacity: out}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <Glow x={960} y={420} r={600} color="#1a6a5a" opacity={0.4} />
        <Chakra x={960} y={420} r={200} color="#7fe0d0" rot={t * 5} sw={4} opacity={0.12} />
        <Particles n={60} seed={301} color="#7fe0d0" size={[1, 2.6]} speed={[-20, -50]} wind={10} glow opacity={0.7} flicker />
      </svg>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontFamily: CINZEL, fontSize: 26, letterSpacing: 14, color: '#8ab8b0', opacity: a}}>THE SECOND BOOK WILL OPEN</div>
        <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 64, letterSpacing: 14, color: '#d8f4ec', marginTop: 22, opacity: b, textShadow: '0 0 30px rgba(127,224,208,0.4)'}}>PART THREE</div>
        <div style={{fontFamily: CORM, fontStyle: 'italic', fontSize: 40, color: '#b8e0d8', marginTop: 6, opacity: b}}>The Touch of Death</div>
      </div>
      <div style={{position: 'absolute', top: 690, left: 220, right: 220, textAlign: 'center', fontFamily: CORM, fontSize: 19, lineHeight: 1.45, color: '#8a9a94', opacity: c}}>
        {(CREDITS as string[]).map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
