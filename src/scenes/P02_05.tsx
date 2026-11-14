import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {Shots} from '../lib/shots';
import {W, H, scene, at, atPhrase, ramp, useT, clamp, lerp, rnd, easeOut, easeInOut, mixColor, noise1} from '../lib/util';
import {Glow, Vignette, Black, Particles, Smoke, Fog, GodRays, CINZEL, CORM} from '../lib/fx';
import {Sky, Sun, Ridge, Clouds, Soldier, Elephant, Banner, SeatedHood, Pothi, Stars} from '../lib/sets';
import {Face, exprTrack, EX} from '../chars/face';
import {Puppet, P, poseTrack, talk, walk} from '../chars/puppet';
import {KEEPER, KEEPER_FIT, ASHOKA, NINE, folk} from '../chars/cast2';
import {mouth} from '../lib/lips';
import {BazaarLayers} from './Bazaar';
import {FogPlane} from '../lib/sets2';
import {Eye, RedBook, KeeperRoom, Lamp} from './common';

/* =========================== P02 title =========================== */
export const P02: React.FC = () => {
  const t = useT();
  const k = ramp(t, 0.2, 1.6, easeOut);
  const b = ramp(t, 1.6, 2.6);
  const out = 1 - ramp(t, 5.6, 6.5);
  const sweep = -600 + ramp(t, 0.4, 3.0) * 3000;
  return (
    <AbsoluteFill style={{background: '#060203', opacity: out}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <Glow x={960} y={540} r={900} color="#6a0a08" opacity={0.5 * k} />
        <Eye x={960} y={520} r={260 + t * 6} open={ramp(t, 0.6, 2.2)} glow={0.35} look={Math.sin(t) * 0.5} />
        <Particles n={90} seed={11} color="#ff5a3a" size={[1, 3]} speed={[-30, -80]} wind={14} glow opacity={0.8} flicker />
        <defs>
          <linearGradient id="t2g" gradientUnits="userSpaceOnUse" x1={sweep - 700} y1={0} x2={sweep + 300} y2={60}>
            <stop offset="0" stopColor="#a8782a" /><stop offset="0.45" stopColor="#e8c27a" /><stop offset="0.6" stopColor="#fff6dc" /><stop offset="0.75" stopColor="#e8c27a" /><stop offset="1" stopColor="#b8862e" />
          </linearGradient>
        </defs>
        <g opacity={k} transform={`translate(960, 470) scale(${1.1 - k * 0.1})`}>
          <text textAnchor="middle" fontFamily={CINZEL} fontWeight={900} fontSize={140} letterSpacing={30 - k * 12} fill="url(#t2g)">ASHOKA</text>
        </g>
        <text x={960} y={545} textAnchor="middle" fontFamily={CINZEL} fontSize={40} letterSpacing={16} fill="#d8c6a2" opacity={k}>AND THE NINE UNKNOWN</text>
        <text x={960} y={650} textAnchor="middle" fontFamily={CINZEL} fontSize={26} letterSpacing={14} fill="#c0504a" opacity={b}>PART TWO</text>
        <text x={960} y={712} textAnchor="middle" fontFamily={CORM} fontStyle="italic" fontSize={54} fill="#f2d6b0" opacity={b}>The First Book</text>
      </svg>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};

/* =========================== P03 recap =========================== */
const sc3 = scene('p03_recap');
const RecapWar: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Camera keys={[{t: 0, z: 1.1, x: -60}, {t: 4, z: 1.0, x: 60}]}>
        <Layer depth={0.05}><Sky id="rw" stops={[[0, '#2a0a08'], [0.5, '#8a2412'], [0.8, '#e0662a'], [1, '#f6b060']]} /><Sun x={960} y={560} r={160} color="#ffd8a0" glow="#ff6a30" /></Layer>
        <Layer depth={0.3}><Ridge y={760} amp={60} color="#7a2614" seed={4} freq={0.002} /></Layer>
        <FogPlane depth={0.4} color="#d06030" opacity={0.25} top={600} fade={0.1} />
        <Layer depth={0.7}>
          {Array.from({length: 40}).map((_, i) => <Soldier key={i} x={-200 + i * 60} y={850} s={0.75} color="#140504" walk={0} />)}
          {[300, 1000, 1700].map((x, i) => <Elephant key={i} x={x} y={860} s={0.8} color="#140504" walk={0.15} phase={i} banner="#9e1a14" />)}
          <Ridge y={900} amp={20} color="#140504" seed={9} freq={0.004} />
        </Layer>
        <Layer depth={1.2}><Particles n={70} seed={5} color="#ffb070" size={[1, 3]} speed={[-10, -30]} wind={50} opacity={0.6} /></Layer>
      </Camera>
      <div style={{position: 'absolute', inset: 0, filter: 'saturate(0.5)', background: 'rgba(40,10,0,0.2)'}} />
      <Vignette strength={0.85} />
      <Black o={1 - ramp(t, 0, 0.6)} />
    </AbsoluteFill>
  );
};
const RecapNine: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tb = at(sc3, 'book') - off;
  return (
    <AbsoluteFill style={{background: '#030202'}}>
      <Camera keys={[{t: 0, z: 1.3, y: 60, f: 1}, {t: 6, z: 1.0, y: 0, f: 1}]} dof={8}>
        <Layer depth={0.7}>
          <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#120a06" />
          <Glow x={960} y={760} r={900} color="#ff8a30" opacity={0.3} />
        </Layer>
        <Layer depth={1}>
          {Array.from({length: 9}).map((_, i) => {
            const a = Math.PI * 0.5 + ((i + 0.5) / 9) * Math.PI * 2;
            return {i, x: 960 + Math.cos(a) * 560, y: 780 + Math.sin(a) * 120, a};
          }).sort((p, q) => p.y - q.y).map((f) => {
            const k = ramp(t, tb - 0.4 + f.i * 0.07, tb + 0.4 + f.i * 0.07);
            const s = 0.85 + (f.y - 660) / 240 * 0.55;
            return (
              <g key={f.i}>
                <SeatedHood x={f.x} y={f.y} s={s * 1.15} color={Math.sin(f.a) < 0 ? '#140c0a' : '#060303'} rim="#ffb35a" rimSide={f.x < 960 ? 1 : -1} breathe={f.i} />
                <Pothi x={lerp(f.x, 960, 0.3)} y={lerp(f.y, 780, 0.3) + 14} s={0.42 * s} glow={k > 0 ? NINE[f.i].color : undefined} color={k > 0.1 ? NINE[f.i].color : '#8a6a3a'} />
              </g>
            );
          })}
          <Lamp x={930} y={780} s={0.5} seed={4} />
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
const RecapOpen: React.FC = () => {
  const t = useT();
  const open = ramp(t, 1.4, 3.2, easeInOut);
  const flash = ramp(t, 2.8, 3.6);
  return (
    <AbsoluteFill style={{background: '#040202'}}>
      <Camera keys={[{t: 0, z: 1.0, y: 0}, {t: 4, z: 1.6, y: -40, ease: (k) => k * k}]}>
        <Layer depth={1}>
          <RedBook x={960} y={640} s={1.5} open={open} />
          <GodRays x={960} y={560} angle={-90} spread={160} n={14} len={1400} color="#ff7a5a" opacity={open * 0.45} seed={4} />
        </Layer>
        <Layer depth={1.2}><Particles n={70} seed={77} color="#ff8a6a" size={[1, 3]} speed={[-20, -50]} wind={6} glow opacity={0.8} flicker /></Layer>
      </Camera>
      <div style={{position: 'absolute', inset: 0, background: '#ffe2d0', opacity: flash}} />
    </AbsoluteFill>
  );
};
export const P03: React.FC = () => {
  const b = [at(sc3, 'nine') - 0.6, atPhrase(sc3, 'we open') - 1.4];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc3.dur} shots={[
        {from: 0, to: b[0], render: () => <RecapWar />},
        {from: b[0], to: b[1], fadeIn: 0.7, render: (o) => <RecapNine off={o} />},
        {from: b[1], to: sc3.dur, fadeIn: 0.6, render: () => <RecapOpen />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== P04 the keeper =========================== */
const sc4 = scene('p04_keeper');
const NoSword: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const pose = poseTrack([[0, walk(P.stand, t * 5, 0.6)], [2.4, {...P.listen, headTilt: -6}, 0.8]], t);
  const e = exprTrack([[0, {...EX.neutral, lookX: -0.5}], [2.6, {...EX.sly, lookX: -0.9, lookY: -0.3}, 0.7]], t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, x: -80, f: 1}, {t: 6, z: 1.12, x: 40, f: 1}]} dof={8}>
        <KeeperRoom night={0.2} />
        <Layer depth={0.9}>
          {/* the sword hanging unused on the wall, dusty */}
          <g transform="translate(560, 480) rotate(-20)">
            <path d="M -8 0 C -10 -160 10 -300 50 -400 C 26 -300 12 -160 8 0 Z" fill="#8a8a88" />
            <rect x={-34} y={0} width={68} height={12} rx={5} fill="#7a5a2a" /><rect x={-8} y={12} width={16} height={60} rx={5} fill="#3a2010" />
            <path d="M 20 -260 l 40 -20 m -40 30 l 46 -6 m -42 22 l 40 4" stroke="#d8d0c0" strokeWidth={1} opacity={0.5} />
          </g>
        </Layer>
        <Layer depth={1}>
          <Puppet id="kns" L={{...KEEPER, ambient: '#e0b080', ambientK: 0.15}} outfit={KEEPER_FIT} pose={pose} e={e} x={lerp(1500, 1080, ramp(t, 0, 2.4, easeOut))} y={1040} s={1.25} dir={-1} turn={0.4} seed={9} light={0.6} />
        </Layer>
      </Camera>
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};
const Sharper: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tw = at(sc4, 'Words.') - off;
  const glow = ramp(t, tw - 0.3, tw + 0.6);
  const n = Math.floor(ramp(t, 0.3, tw + 0.3) * 18);
  return (
    <AbsoluteFill style={{background: '#050302'}}>
      <Camera keys={[{t: 0, z: 1.15, y: 30, f: 1}, {t: 4, z: 1.3, y: 0, f: 1}]} dof={10}>
        <KeeperRoom night={0.7} />
        <Layer depth={1}>
          <rect x={260} y={600} width={1400} height={170} rx={16} fill="#c9a86a" />
          {Array.from({length: n}).map((_, c) => {
            const gx = 330 + c * 66, gy = 690;
            const kk = Math.floor(rnd(c) * 4);
            const d = kk === 0 ? `M ${gx} ${gy} l 0 -36 m -12 18 l 24 0` : kk === 1 ? `M ${gx - 12} ${gy} l 12 -36 l 12 36` : kk === 2 ? `M ${gx - 12} ${gy - 36} l 0 36 l 24 0` : `M ${gx - 12} ${gy - 18} a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0`;
            return <path key={c} d={d} stroke={glow > 0 ? mixColor('#2a1608', '#ff6a3a', glow) : '#2a1608'} strokeWidth={5} fill="none" strokeLinecap="round" style={glow > 0.3 ? {filter: 'drop-shadow(0 0 8px #ff4a2a)'} : undefined} />;
          })}
          {/* hand + stylus */}
          {(() => {
            const gx = 330 + Math.max(0, n - 1) * 66 + Math.sin(t * 18) * 4;
            return (
              <g transform={`translate(${gx}, 690)`}>
                <line x1={0} y1={0} x2={60} y2={-170} stroke="#b8b0a0" strokeWidth={6} />
                <path d="M 30 -110 C 60 -150 120 -170 180 -150 C 220 -136 260 -100 300 -60 L 260 20 C 200 -20 140 -60 80 -70 C 50 -74 30 -90 30 -110 Z" fill={KEEPER.skin} />
                <path d="M 180 -150 C 260 -180 400 -160 500 -100 L 460 0 C 380 -40 320 -60 260 20 Z" fill="#3a2a4a" />
              </g>
            );
          })()}
          <Glow x={960} y={680} r={500} color="#ff5a3a" opacity={glow * 0.4} />
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
/** bazaar groups the keeper listens to: rumour (whispering women), gossip (laughing men), song (a minstrel) */
const Listens: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tR = at(sc4, 'rumours.') - off, tG = at(sc4, 'gossip.') - off, tS = at(sc4, 'songs') - off;
  const camX = t < tR - 0.4 ? 0 : t < tG - 0.3 ? lerp(0, 560, ramp(t, tR - 0.4, tR + 0.4)) : t < tS - 0.4 ? lerp(560, 1120, ramp(t, tG - 0.3, tG + 0.5)) : lerp(1120, 1680, ramp(t, tS - 0.4, tS + 0.6));
  const wave = (x: number, y: number, active: number, color: string) => active > 0 && Array.from({length: 3}).map((_, i) => {
    const ph = ((t * 0.8 + i / 3) % 1);
    return <path key={i} d={`M ${x} ${y - 30 * ph} q ${-200 * ph} ${-80 * ph} ${-400 * ph} ${-20 * ph}`} stroke={color} strokeWidth={3} fill="none" opacity={(1 - ph) * active} />;
  });
  const w1 = folk(1), w2 = folk(4), m1 = folk(0), m2 = folk(6), sg = folk(9);
  const lip = (on: boolean, s = 1) => (on ? Math.max(0, Math.sin(t * 10 * s)) * 0.5 : 0);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, x: camX, z: 1.05, f: 1}]} dof={9} drift={0.6}>
        <BazaarLayers tod="day" crowd={0.8} fg={false} />
        <Layer depth={1}>
          {/* the keeper, at the left, listening */}
          <Puppet id="kl" L={{...KEEPER, ambient: '#f0d8b0', ambientK: 0.1}} outfit={KEEPER_FIT} pose={P.listen} e={{...EX.sly, lookX: 0.8, lid: 0.55}} x={260} y={1040} s={1.2} turn={0.5} seed={2} />
          {/* rumour: two women */}
          <Puppet id="w1" L={w1.L} outfit={w1.fit} pose={{...P.stand, headTilt: 10, lean: 6}} e={{...EX.sly, open: lip(t > tR - 1, 1), lookX: 0.6}} x={760} y={1020} s={1.05} turn={0.5} seed={3} />
          <Puppet id="w2" L={w2.L} outfit={w2.fit} pose={{...P.listen, headTilt: -8}} e={{...EX.shock, lookX: -0.6, open: 0.25}} x={960} y={1020} s={1.05} dir={-1} turn={0.5} seed={4} />
          {wave(760, 640, ramp(t, tR - 1, tR), '#ffd27a')}
          {/* gossip: laughing men */}
          <Puppet id="m1" L={m1.L} outfit={m1.fit} pose={talk(P.stand, t, 1, 2)} e={{...EX.proud, smile: 0.8, open: 0.3 + lip(true, 0.7) * 0.6}} x={1360} y={1020} s={1.08} turn={0.4} seed={5} />
          <Puppet id="m2" L={m2.L} outfit={m2.fit} pose={{...P.proud}} e={{...EX.proud, smile: 0.9, open: 0.45, lid: 0.4}} x={1560} y={1020} s={1.08} dir={-1} turn={0.4} seed={6} />
          {wave(1360, 640, ramp(t, tG - 1, tG), '#ffb070')}
          {/* song: a minstrel with an ektara, children around */}
          <Puppet id="sg" L={sg.L} outfit={{kind: 'dhoti', c1: '#ece4d0', c2: '#c8502a'}} pose={{...P.hold, rSh: -60, rEl: -40 + Math.sin(t * 8) * 10}} e={{...EX.serene, open: 0.2 + lip(true, 0.5) * 0.5, lid: 0.3}} x={2040} y={1020} s={1.1} turn={0.1} seed={7} />
          <g transform={`translate(${2040 + 30}, ${1020 - 330}) rotate(-25)`}><ellipse cx={0} cy={120} rx={36} ry={44} fill="#8a5a2a" /><rect x={-4} y={-140} width={8} height={260} fill="#5a3418" /></g>
          {[1890, 2200].map((x, i) => { const c = folk(10 + i); return <Puppet key={i} id={`ch${i}`} L={c.L} outfit={c.fit} pose={P.cheer} e={{...EX.proud, smile: 1, open: 0.3}} x={x} y={1030} s={0.7} turn={i ? -0.4 : 0.4} seed={8 + i} />; })}
          {wave(2040, 640, ramp(t, tS - 1, tS), '#ffe2a0')}
          {Array.from({length: 5}).map((_, i) => <text key={i} x={2000 + Math.sin(t * 2 + i) * 60 + i * 40} y={600 - ((t * 60 + i * 50) % 260)} fontSize={44} fill="#ffe2a0" opacity={t > tS - 1 ? 0.7 : 0}>♪</text>)}
        </Layer>
      </Camera>
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};
/** top-down: the crowd as flowing streams */
const Flow: React.FC = () => {
  const t = useT();
  const dots = Array.from({length: 260}).map((_, i) => {
    const lane = i % 5;
    const u = ((rnd(i) + t * (0.04 + rnd(i * 3) * 0.04)) % 1);
    const paths = [[[0, 300], [700, 420], [1200, 640], [1920, 700]], [[300, 0], [520, 400], [960, 560], [1100, 1080]], [[1920, 260], [1300, 460], [960, 560], [500, 1080]], [[0, 800], [600, 640], [960, 560], [1920, 380]], [[1500, 0], [1200, 300], [960, 560], [900, 1080]]][lane];
    const seg = Math.min(2, Math.floor(u * 3)), k = u * 3 - seg;
    const [a, b] = [paths[seg], paths[seg + 1]];
    return {x: lerp(a[0], b[0], k) + (rnd(i * 7) - 0.5) * 60, y: lerp(a[1], b[1], k) + (rnd(i * 9) - 0.5) * 60, c: ['#c8702a', '#2a6a6a', '#8a2a2a', '#d8c08a', '#6a3a7a'][i % 5]};
  });
  return (
    <AbsoluteFill style={{background: '#3a2a1c'}}>
      <Camera keys={[{t: 0, z: 1.2, r: -4}, {t: 3, z: 1.0, r: 4}]}>
        <Layer depth={1}>
          <rect x={-600} y={-600} width={W + 1200} height={H + 1200} fill="#5a4030" />
          {Array.from({length: 14}).map((_, i) => <rect key={i} x={rnd(i) * 1800} y={rnd(i * 3) * 1000} width={160} height={110} fill={['#8a2a2a', '#2a5a6a', '#c88a2a'][i % 3]} opacity={0.85} />)}
          {dots.map((d, i) => <g key={i}><circle cx={d.x} cy={d.y} r={11} fill={d.c} /><circle cx={d.x} cy={d.y} r={6} fill="#1a0e08" /></g>)}
          <circle cx={960} cy={560} r={120 + Math.sin(t * 3) * 10} fill="none" stroke="#ff5a3a" strokeWidth={3} strokeDasharray="10 10" opacity={0.8} />
        </Layer>
      </Camera>
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};
const FirstLine: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tw = at(sc4, 'wrote') - off;
  const end = sc4.dur - off;
  const glow = ramp(t, tw, tw + 1.4);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, f: 1}, {t: end, z: 1.25, y: 40, f: 1}]} dof={10}>
        <KeeperRoom night={1} />
        <Layer depth={1}>
          <Puppet id="kfl" L={{...KEEPER, ambient: '#6a5a7a', ambientK: 0.35, rim: '#ffb060'}} outfit={KEEPER_FIT} pose={{...P.write, rSh: -20, rEl: -100 + Math.sin(t * 12) * 4, lSh: 30, lEl: -80, lean: 12}} e={{...EX.stern, lookY: 0.8, lookX: 0.5, lid: 0.6}} x={860} y={960} s={1.3} turn={0.45} seed={11} light={0.8} seated />
          <rect x={900} y={880} width={600} height={30} fill="#3a1e10" />
          <Lamp x={1380} y={872} s={0.6} seed={2} />
          <RedBook x={1100} y={860} s={0.55} open={glow} glow={0.5 + glow} />
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
    </AbsoluteFill>
  );
};
export const P04: React.FC = () => {
  const b = [at(sc4, 'He', 1) - 0.3, at(sc4, 'He', 2) - 0.3, atPhrase(sc4, 'He was') - 0.3, atPhrase(sc4, 'And one') - 0.3];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc4.dur} shots={[
        {from: 0, to: b[0], render: (o) => <NoSword off={o} />},
        {from: b[0], to: b[1], fadeIn: 0.5, render: (o) => <Sharper off={o} />},
        {from: b[1], to: b[2], fadeIn: 0.6, render: (o) => <Listens off={o} />},
        {from: b[2], to: b[3], fadeIn: 0.5, render: () => <Flow />},
        {from: b[3], to: sc4.dur, fadeIn: 0.6, render: (o) => <FirstLine off={o} />},
      ]} />
    </AbsoluteFill>
  );
};

/* =========================== P05 keeper speaks (lip-sync) =========================== */
const sc5 = scene('p05_keeper_line');
export const P05: React.FC = () => {
  const t = useT();
  const vt = t - (sc5.vo ?? 0);
  const m = mouth('p05_keeper_line', vt);
  const tStory = at(sc5, 'story...');
  const e = exprTrack([[0, {...EX.neutral, lookX: 0.3, lid: 0.7}], [1.2, {...EX.stern, lookX: 0, lid: 0.7}, 0.5], [tStory - 0.2, {...EX.sly, lookX: 0, smile: 0.35}, 0.6], [sc5.dur - 2, {...EX.sly, smile: 0.55, lid: 0.5}, 0.8]], t);
  const ee = {...e, open: Math.max(e.open, m.open * 0.65)};
  const focus = lerp(1.5, 1, ramp(t, 0.2, 1.4));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, x: 0, f: focus}, {t: sc5.dur, z: 1.18, x: 40, y: -20, f: 1}]} dof={14} drift={0.4}>
        <KeeperRoom night={1} />
        <Layer depth={1}>
          <Face id="kspeak" L={{...KEEPER, ambient: '#5a4a6a', ambientK: 0.35, rim: '#ffb060', rimSide: 1, key: 0.8, hi: '#ffb070'}} e={ee} x={900} y={560} s={2.0} turn={0.15} tilt={Math.sin(t * 0.8) * 2 + m.energy * 2} seed={12} />
        </Layer>
        <Layer depth={1.5}>
          {/* foreground: the sword and the book on the table, out of focus */}
          <g transform="translate(240, 1060) rotate(-70)"><path d="M -12 0 C -15 -240 15 -450 75 -600 C 39 -450 18 -240 12 0 Z" fill="#9a9a98" /><rect x={-50} y={0} width={100} height={18} rx={8} fill="#7a5a2a" /></g>
          <RedBook x={1640} y={1040} s={0.7} glow={0.5} />
        </Layer>
      </Camera>
      <Vignette strength={0.9} />
      <Black o={ramp(t, sc5.dur - 0.7, sc5.dur)} />
    </AbsoluteFill>
  );
};
