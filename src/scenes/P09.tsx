import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {Shots} from '../lib/shots';
import {W, H, scene, at, atPhrase, ramp, useT, clamp, lerp, rnd, easeOut, easeInOut, easeIn, mixColor, noise1} from '../lib/util';
import {Glow, Vignette, Black, Particles, Smoke, GodRays, Flame, Fog, CINZEL, CORM} from '../lib/fx';
import {Sky, Sun, Ridge, Clouds, Stars, River, CitySkyline, Banner} from '../lib/sets';
import {Face, exprTrack, EX, mixEx} from '../chars/face';
import {Puppet, P, poseTrack, talk, walk} from '../chars/puppet';
import {KEEPER, KEEPER_FIT, folk} from '../chars/cast2';
import {FogPlane, Hut, Palm, Crowd, Lantern, Granary} from '../lib/sets2';
import {Eye, RedBook, KeeperRoom} from './common';

const sc = scene('p09_laws');
const label = (txt: string, o: number, color = '#ffe2b0', y = 170, size = 54) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', fontFamily: CINZEL, fontWeight: 700, fontSize: size, letterSpacing: 18, color, opacity: o, textShadow: '0 4px 20px rgba(0,0,0,0.9)'}}>{txt}</div>
);

/* intro: into the book */
const IntoBook: React.FC = () => {
  const t = useT();
  const open = ramp(t, 0.3, 2.0, easeOut);
  const dive = ramp(t, 5.5, 9.0, easeIn);
  return (
    <AbsoluteFill style={{background: '#050202'}}>
      <Camera keys={[{t: 0, z: 1.0}, {t: 5.5, z: 1.25}, {t: 9.0, z: 6.0, y: -150, ease: easeIn}]}>
        <KeeperRoom night={1} />
        <Layer depth={1}>
          <RedBook x={960} y={720} s={1.6} open={open} glow={1 + dive} />
          <GodRays x={960} y={560} angle={-90} spread={140} n={12} len={1400} color="#ff5a3a" opacity={0.35 * open} seed={9} />
          {/* page illustration: a crowd drawn in red ink, beginning to move */}
          <g opacity={open} transform="translate(960, 540)">
            {Array.from({length: 26}).map((_, i) => {
              const x = -230 + (i % 13) * 36, y = -20 + Math.floor(i / 13) * 34;
              const bob = Math.sin(t * 3 + i) * 2 * ramp(t, 3, 5);
              return <g key={i} transform={`translate(${x}, ${y + bob})`}><circle r={8} fill="#7a1a10" /><path d="M -12 22 Q 0 4 12 22 Z" fill="#7a1a10" /></g>;
            })}
          </g>
        </Layer>
        <Layer depth={1.2}><Particles n={60} seed={91} color="#ff7a5a" size={[1, 3]} speed={[-20, -50]} wind={6} glow opacity={0.7} flicker /></Layer>
      </Camera>
      <div style={{position: 'absolute', inset: 0, background: '#e8c8a0', opacity: ramp(t, 8.2, 9.2)}} />
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};

/* law 1: repetition — one phrase, many mouths, until it turns to stone */
const Repetition: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tRum = at(sc, 'rumour.') - off, tFact = at(sc, 'fact.', 1) - off;
  const n = Math.min(60, Math.floor(1 + Math.pow(Math.max(0, t - 0.5), 2) * 2.2));
  const stone = ramp(t, tFact - 0.6, tFact + 0.6);
  const faces = [0, 1, 2, 3, 4];
  return (
    <AbsoluteFill style={{background: '#e8d4b0'}}>
      <Camera keys={[{t: 0, z: 1.1}, {t: 11, z: 0.95}]} drift={0.5}>
        <Layer depth={0.5}>
          <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill={mixColor('#e8d4b0', '#8a8278', stone)} />
          {Array.from({length: n}).map((_, i) => {
            const x = 120 + rnd(i * 3) * 1680, y = 120 + rnd(i * 5) * 520;
            const s = 0.6 + rnd(i * 7) * 0.7;
            return (
              <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity={clamp((t - 0.5 - Math.sqrt(i / 2.2)) * 3)}>
                <path d="M -90 -40 Q -90 -70 -60 -70 L 60 -70 Q 90 -70 90 -40 L 90 10 Q 90 40 60 40 L -10 40 L -30 70 L -26 40 L -60 40 Q -90 40 -90 10 Z" fill={mixColor('#fff6e4', '#9a9288', stone)} stroke={mixColor('#7a1a10', '#4a443e', stone)} strokeWidth={4} />
                <text x={0} y={-6} textAnchor="middle" fontFamily={CINZEL} fontWeight={700} fontSize={30} fill={mixColor('#7a1a10', '#3a342e', stone)}>THEY SAY…</text>
              </g>
            );
          })}
        </Layer>
        <Layer depth={1}>
          {faces.map((i) => {
            const f = folk(100 + i);
            const speaking = Math.max(0, Math.sin(t * 8 + i * 1.3)) * 0.45;
            return <Face key={i} id={`rep${i}`} L={{...f.L, outfit: 'white', outfitColor: f.fit.c2 ?? '#c8a050', outfitColor2: '#8a6a3a', ambient: mixColor('#ffe0c0', '#a09a90', stone), ambientK: 0.2 + stone * 0.3}} e={{...EX.sly, open: speaking * (1 - stone), lookX: i < 2 ? 0.7 : -0.7, lid: 0.6}} x={240 + i * 360} y={830} s={0.75} turn={i < 2 ? 0.4 : -0.4} seed={100 + i} />;
          })}
        </Layer>
      </Camera>
      {label('RUMOUR', ramp(t, tRum - 0.2, tRum + 0.4) * (1 - ramp(t, tFact - 1.4, tFact - 0.8)), '#7a1a10', 150)}
      <div style={{position: 'absolute', left: 660, width: 600, top: 380, height: 200, background: '#5a544c', boxShadow: 'inset 0 0 30px #000, 0 10px 40px #000', opacity: ramp(t, tFact - 0.2, tFact + 0.4)}} />
      {label('FACT', ramp(t, tFact - 0.2, tFact + 0.4), '#1a1612', 400, 120)}
      <Vignette strength={0.6} color="40,20,0" />
    </AbsoluteFill>
  );
};

/* law 2: fear — a whisper of famine empties the granary */
const Fear: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tG = at(sc, 'granary') - off;
  const rush = ramp(t, 1.0, 3.0);
  const empty = ramp(t, tG - 0.5, tG + 2.0);
  const people = Array.from({length: 18}).map((_, i) => {
    const f = folk(120 + i);
    const ph = (t * 0.35 + rnd(i)) % 1;
    const toward = ph < 0.5;
    const x = toward ? lerp(-200 + rnd(i * 3) * 300, 860, ph * 2) : lerp(1060, 2100 - rnd(i * 5) * 300, (ph - 0.5) * 2);
    const y = 960 + rnd(i * 7) * 80;
    return {i, f, x, y, toward};
  }).sort((a, b) => a.y - b.y);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.08, x: -40, f: 1}, {t: 7, z: 1.0, x: 40, f: 1}]} dof={7} shake={2 * rush}>
        <Layer depth={0.03}><Sky id="fr" stops={[[0, '#05040c'], [0.7, '#1a1430'], [1, '#3a1a20']]} /><Stars n={160} seed={4} /><circle cx={300} cy={180} r={40} fill="#e8d8c8" /></Layer>
        <Layer depth={0.3}><CitySkyline y={760} color="#0c0a14" seed={9} scale={0.8} window="#ff9a4a" /></Layer>
        <FogPlane depth={0.4} color="#3a1a20" opacity={0.3} top={500} fade={0.1} />
        <Layer depth={1}>
          <rect x={-1000} y={900} width={W + 2000} height={600} fill="#2a1a12" />
          <Granary x={960} y={960} s={1.1} c="#6a4a32" open={empty} />
          {[600, 1320].map((x, i) => <g key={i}><rect x={x - 5} y={770} width={10} height={190} fill="#2a1408" /><Flame x={x} y={770} s={1.2} seed={i + 7} /></g>)}
          {people.map(({i, f, x, y, toward}) => (
            <g key={i}>
              <Puppet id={`fr${i}`} L={{...f.L, ambient: '#ff8a4a', ambientK: 0.25}} outfit={f.fit} pose={walk({...P.stand, lean: 10, lSh: toward ? 30 : -30, lEl: toward ? -40 : -110, lHand: 1}, t * 9 + i, 1.2)} e={{...EX.horror, lookX: toward ? 0.6 : -0.6}} x={x} y={y} s={0.82} dir={toward ? 1 : -1} turn={0.5} seed={120 + i} lod={0} />
              {!toward && <ellipse cx={x + (toward ? 30 : -30)} cy={y - 220} rx={40} ry={34} fill="#c8a868" />}
            </g>
          ))}
        </Layer>
        <Layer depth={1.2}><Smoke x={600} y={760} scale={1.2} color="#3a2a2a" opacity={0.3} seed={5} /><Particles n={60} seed={93} color="#ffb070" size={[1, 3]} speed={[-30, -60]} wind={20} glow opacity={0.7} flicker /></Layer>
      </Camera>
      {label('FEAR', ramp(t, 0.3, 1.0) * (1 - ramp(t, 3.5, 4.2)), '#ff8a6a')}
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};

/* law 3: the common enemy */
const Enemy: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tS = at(sc, 'shadow.') - off;
  const rise = ramp(t, tS - 2.6, tS + 0.2, easeOut);
  const unite = ramp(t, tS - 0.8, tS + 1.2);
  const tribe = (side: number) => Array.from({length: 6}).map((_, i) => {
    const f = folk(140 + i + (side > 0 ? 10 : 0));
    const x0 = side < 0 ? 300 + i * 70 : 1620 - i * 70;
    const x = lerp(x0, 760 + i * 70 + (side > 0 ? 40 : 0), unite);
    return <Puppet key={`${side}${i}`} id={`en${side}${i}`} L={{...f.L, ambient: side < 0 ? '#c86a5a' : '#5a7ac8', ambientK: 0.25}} outfit={{...f.fit, c2: side < 0 ? '#9a1a1a' : '#1a3a8a'}} pose={unite > 0.5 ? {...P.stand, lSh: 8, rSh: -8, lean: -3} : {...P.point, lean: 4}} e={unite > 0.5 ? {...EX.resolve, lookX: 0, lookY: -0.4} : {...EX.fierce, lookX: side < 0 ? 0.7 : -0.7}} x={x} y={1010 + (i % 2) * 30} s={0.9} dir={unite > 0.5 ? 1 : side < 0 ? 1 : -1} turn={unite > 0.5 ? 0 : 0.5} seed={140 + i + side} lod={0} />;
  });
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, y: 0, f: 1}, {t: tS, z: 1.08, y: -40, f: 1}, {t: tS + 3, z: 1.15, y: -60, f: 1}]} dof={6} shake={rise > 0.9 ? 3 : 0}>
        <Layer depth={0.03}><Sky id="en" stops={[[0, mixColor('#3a5a8a', '#1a0608', rise)], [0.7, mixColor('#e8c098', '#5a1a14', rise)], [1, mixColor('#fff0c8', '#8a2a14', rise)]]} /></Layer>
        <Layer depth={0.12}>
          {/* the shadow rises over the horizon */}
          <g transform={`translate(960, ${880 - rise * 520}) scale(${1 + rise * 0.3})`} opacity={rise}>
            <path d="M -360 600 C -380 300 -300 100 -160 40 C -200 -40 -190 -160 -100 -220 C -60 -280 60 -280 100 -220 C 190 -160 200 -40 160 40 C 300 100 380 300 360 600 Z" fill="#0a0204" style={{filter: 'blur(4px)'}} />
            <ellipse cx={-50} cy={-120} rx={22} ry={10} fill="#ff2a1a" style={{filter: 'drop-shadow(0 0 14px #ff2a1a)'}} />
            <ellipse cx={50} cy={-120} rx={22} ry={10} fill="#ff2a1a" style={{filter: 'drop-shadow(0 0 14px #ff2a1a)'}} />
          </g>
        </Layer>
        <Layer depth={0.3}><Ridge y={820} amp={50} color={mixColor('#6a7a5a', '#1a0a0a', rise)} seed={6} freq={0.002} /></Layer>
        <FogPlane depth={0.36} color={mixColor('#f0d8b8', '#5a1a14', rise)} opacity={0.3} top={600} fade={0.1} />
        <Layer depth={0.55}>
          <rect x={-1000} y={860} width={W + 2000} height={600} fill={mixColor('#8a7a4a', '#2a1a10', rise)} />
          {[[-100, '#9a1a1a'], [1650, '#1a3a8a']].map(([x, c], i) => (
            <g key={i}>
              {[0, 1, 2].map((k) => <Hut key={k} x={(x as number) + k * 180} y={900} s={0.55} wall={mixColor('#a8704a', '#3a2010', rise)} roof={mixColor('#7a6a3a', '#2a2010', rise)} />)}
              <line x1={(x as number) + 200} y1={900} x2={(x as number) + 200} y2={600} stroke="#2a1408" strokeWidth={6} />
              <Banner x={(x as number) + 200} y={600} w={110} h={70} color={c as string} phase={i * 2} />
            </g>
          ))}
          <River y={880} h={36} color={mixColor('#4a7a8a', '#2a1a1a', rise)} hi="#cfe8f0" x0={880} x1={1060} speed={10} />
        </Layer>
        <Layer depth={1}>{tribe(-1)}{tribe(1)}</Layer>
      </Camera>
      {label('A COMMON ENEMY', ramp(t, 0.3, 1.0) * (1 - ramp(t, 3.0, 3.6)), '#ffe2b0')}
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};

/* law 4: everyone else already believes — the doubter nods */
const Nod: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tD = at(sc, 'does.') - off;
  const give = ramp(t, tD - 1.2, tD + 0.2);
  const nod = (seed: number, k = 1) => Math.sin(t * 5 + seed) * 6 * k;
  const e = exprTrack([[0, {...EX.troubled, lookX: -0.8}], [1.4, {...EX.troubled, lookX: 0.8}, 0.4], [2.6, {...EX.troubled, lookX: -0.6, browIn: 12}, 0.4], [tD - 1.2, {...EX.neutral, lookX: 0, smile: 0.2, lid: 0.7}, 1.0]], t);
  const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== 2);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, f: 1}, {t: 6, z: 1.15, f: 1}]} dof={12} drift={0.4}>
        <Layer depth={0.4}>
          <Sky id="nd" stops={[[0, '#c8a070'], [1, '#6a4a30']]} />
          <Crowd n={40} y={1000} spread={60} s={0.6} seed={33} speed={0} still={1} standing={1} turnTo={0} lod={0} />
        </Layer>
        <FogPlane depth={0.6} color="#c8a070" opacity={0.25} />
        <Layer depth={1}>
          {others.map((i) => {
            const f = folk(160 + i);
            return <Face key={i} id={`nd${i}`} L={{...f.L, outfit: 'white', outfitColor: f.fit.c2 ?? '#c8a050', outfitColor2: '#8a6a3a', ambient: '#e0b080', ambientK: 0.2}} e={{...EX.serene, lid: 0.6, smile: 0.3}} x={170 + i * 316} y={640 + nod(i) * 1.5} s={0.85} tilt={nod(i)} turn={0} seed={160 + i} />;
          })}
          <Face id="doubter" L={{...folk(170).L, outfit: 'white', outfitColor: '#2a6a6a', outfitColor2: '#1a4a4a', ambient: '#e0b080', ambientK: 0.15, rim: '#fff0d0'}} e={e} x={170 + 2 * 316} y={620 + nod(2, give) * 1.5} s={1.0} tilt={nod(2, give)} turn={0} seed={170} />
        </Layer>
      </Camera>
      {label('EVERYONE ELSE BELIEVES IT', ramp(t, 0.3, 1.0) * (1 - ramp(t, 3.4, 4.0)), '#fff2d8', 150, 40)}
      <Vignette strength={0.75} />
    </AbsoluteFill>
  );
};

/* outro: the keeper moves the crowd without raising his voice */
const Balcony: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tV = at(sc, 'voice.') - off;
  const end = sc.dur - off;
  const gesture = ramp(t, tV - 3.6, tV - 2.8);
  const bend = ramp(t, tV - 3.2, tV);
  const stream = Array.from({length: 120}).map((_, i) => {
    const u = (rnd(i) + t * 0.04) % 1;
    const x = lerp(-200, 2100, u);
    const yBase = 820 + Math.sin(u * 6 + rnd(i * 3)) * 30;
    const y = yBase - bend * Math.sin(u * Math.PI) * 180 + (rnd(i * 5) - 0.5) * 50;
    return <circle key={i} cx={x} cy={y} r={3 + rnd(i * 7) * 3} fill="#ffcf7a" opacity={0.8} />;
  });
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.35, x: -260, y: -60, f: 1}, {t: end, z: 1.0, x: 0, y: 0, f: 1}]} dof={6}>
        <Layer depth={0.03}><Sky id="bl" stops={[[0, '#120a20'], [0.5, '#5a2a4a'], [0.85, '#d0603a'], [1, '#f0a050']]} /></Layer>
        <Layer depth={0.2}><CitySkyline y={760} color="#1a0e1c" seed={41} scale={1.1} window="#ffcf7a" /></Layer>
        <FogPlane depth={0.3} color="#5a2a3a" opacity={0.3} top={500} fade={0.1} />
        <Layer depth={0.5}>
          <rect x={-1000} y={760} width={W + 2000} height={600} fill="#140a10" />
          {stream}
          <Glow x={960} y={820} r={700} color="#ffb347" opacity={0.15} />
        </Layer>
        <Layer depth={1}>
          {/* balcony */}
          <rect x={-600} y={880} width={1400} height={600} fill="#2a1418" />
          {Array.from({length: 14}).map((_, i) => <rect key={i} x={-560 + i * 100} y={790} width={36} height={90} fill="#2a1418" />)}
          <rect x={-600} y={780} width={1400} height={20} fill="#3a1e20" />
          <Puppet id="kbal" L={{...KEEPER, ambient: '#c06050', ambientK: 0.3, rim: '#ffb060'}} outfit={KEEPER_FIT} pose={{...P.stand, lSh: lerp(8, 70, gesture), lEl: lerp(-6, -10, gesture), lWr: lerp(0, -30, gesture), rSh: -20, rEl: 60, rHand: 1}} e={{...EX.sly, lookX: 0.8, lookY: 0.5, lid: 0.5}} x={380} y={880} s={1.3} turn={0.5} seed={4} light={0.8} />
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
      <Black o={ramp(t, end - 0.8, end)} />
    </AbsoluteFill>
  );
};

export const P09: React.FC = () => {
  const b = [atPhrase(sc, 'That a crowd') - 0.3, atPhrase(sc, 'That fear') - 0.3, atPhrase(sc, 'That a common') - 0.3, atPhrase(sc, 'And that people') - 0.3, atPhrase(sc, 'Four simple') - 0.3];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots total={sc.dur} shots={[
        {from: 0, to: b[0], fadeIn: 0.5, render: () => <IntoBook />},
        {from: b[0], to: b[1], fadeIn: 0.4, render: (o) => <Repetition off={o} />},
        {from: b[1], to: b[2], fadeIn: 0.5, render: (o) => <Fear off={o} />},
        {from: b[2], to: b[3], fadeIn: 0.5, render: (o) => <Enemy off={o} />},
        {from: b[3], to: b[4], fadeIn: 0.5, render: (o) => <Nod off={o} />},
        {from: b[4], to: sc.dur, fadeIn: 0.7, render: (o) => <Balcony off={o} />},
      ]} />
    </AbsoluteFill>
  );
};
