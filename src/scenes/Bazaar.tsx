import React from 'react';
import {Layer} from '../lib/camera';
import {W, H, rnd, useT, lerp, mixColor} from '../lib/util';
import {Glow, Particles, Smoke} from '../lib/fx';
import {Sky, Stars, CitySkyline} from '../lib/sets';
import {FogPlane, Lantern, Stall, Garland, Crowd} from '../lib/sets2';
import {Expr} from '../chars/face';

export type Tod = 'night' | 'dusk' | 'dawn' | 'day';
const PAL: Record<Tod, {sky: [number, string][]; fogFar: string; fogNear: string; city: string; ground: string; lit: number; amb: string; ambK: number}> = {
  night: {sky: [[0, '#05060f'], [0.5, '#141a36'], [1, '#2a2a4a']], fogFar: '#1e1a34', fogNear: '#3a2228', city: '#100e1c', ground: '#1e140e', lit: 1, amb: '#6a5a8a', ambK: 0.35},
  dusk: {sky: [[0, '#1a1438'], [0.45, '#7a3a5a'], [0.75, '#e0784a'], [1, '#f6b870']], fogFar: '#b0606a', fogNear: '#6a3030', city: '#3a1e2a', ground: '#3a2418', lit: 0.7, amb: '#e0907a', ambK: 0.2},
  dawn: {sky: [[0, '#3a4a7a'], [0.5, '#c8a0a8'], [0.8, '#f4d0a0'], [1, '#fff0d0']], fogFar: '#e8c8b8', fogNear: '#b08070', city: '#6a5a6a', ground: '#5a4030', lit: 0.15, amb: '#f0d0c0', ambK: 0.15},
  day: {sky: [[0, '#4a7ab8'], [0.6, '#a8c8e0'], [1, '#f0e8d0']], fogFar: '#d8d0c0', fogNear: '#a89070', city: '#8a7a6a', ground: '#8a6a48', lit: 0, amb: '#ffffff', ambK: 0},
};

/** multiplane night market of Pataliputra. `crowdE` drives every face (for the "everyone believes" beat). */
export const BazaarLayers: React.FC<{tod?: Tod; crowd?: number; turnTo?: number; still?: number; crowdE?: Expr; children?: React.ReactNode; fg?: boolean}> = ({tod = 'night', crowd = 1, turnTo, still = 0, crowdE, children, fg = true}) => {
  const p = PAL[tod];
  const lanterns = (y: number, s: number, seed: number, n: number) =>
    Array.from({length: n}).map((_, i) => <Lantern key={i} x={-300 + i * (W + 600) / n + rnd(seed + i) * 80} y={y + rnd(seed * 3 + i) * 60} s={s} seed={seed + i} lit={p.lit} color={i % 4 === 0 ? '#ff7a4a' : '#ffb347'} />);
  return (
    <>
      <Layer depth={0.03}>
        <Sky id={`bz_${tod}`} stops={p.sky} />
        {tod === 'night' && <Stars n={180} seed={21} opacity={0.8} />}
        {tod === 'night' && <><circle cx={1500} cy={200} r={46} fill="#f4f0e0" /><Glow x={1500} y={200} r={260} color="#c8d0ff" opacity={0.25} /></>}
        {tod === 'dawn' && <Glow x={960} y={760} r={900} color="#fff0c0" opacity={0.6} />}
      </Layer>
      <Layer depth={0.12}>
        <CitySkyline y={640} color={p.city} seed={31} scale={0.9} window={p.lit > 0.3 ? '#ffcf7a' : undefined} />
        {/* palace with domes */}
        <g transform="translate(960, 640)">
          <path d="M -260 0 L -260 -150 L 260 -150 L 260 0 Z" fill={p.city} />
          <path d="M -120 -150 A 120 110 0 0 1 120 -150 Z" fill={p.city} />
          <rect x={-8} y={-300} width={16} height={60} fill={p.city} />
          {[-220, 220].map((x, i) => <path key={i} d={`M ${x - 40} -150 L ${x} -260 L ${x + 40} -150 Z`} fill={p.city} />)}
        </g>
      </Layer>
      <FogPlane depth={0.18} color={p.fogFar} opacity={0.42} top={420} fade={0.04} />
      <Layer depth={0.3}>
        <rect x={-2000} y={700} width={W + 4000} height={900} fill={mixColor(p.ground, p.fogFar, 0.4)} />
        {Array.from({length: 9}).map((_, i) => <Stall key={i} x={-500 + i * 380} y={720} s={0.5} c1={['#8a2a2a', '#2a5a6a', '#c88a2a'][i % 3]} c2="#e8dcc0" goods={i % 3} seed={i} light={p.lit > 0.3 ? '#ffb347' : undefined} />)}
        {lanterns(430, 0.5, 3, 16)}
        {crowd > 0 && <Crowd n={Math.round(26 * crowd)} y={760} spread={30} s={0.32} seed={2} speed={30} lod={0} dim={p.fogFar} dimK={0.45} turnTo={turnTo} still={still} e={crowdE} />}
      </Layer>
      <FogPlane depth={0.4} color={p.fogFar} opacity={0.2} top={300} fade={0.05} />
      <Layer depth={0.55}>
        <rect x={-2000} y={790} width={W + 4000} height={900} fill={mixColor(p.ground, p.fogNear, 0.25)} />
        {[-700, -250, 1950, 2400].map((x, i) => <Stall key={i} x={x} y={820} s={0.8} c1={['#2a6a4a', '#8a2a4a', '#c8502a', '#2a3a7a'][i]} c2="#efe2c4" goods={(i + 1) % 3} seed={i + 10} light={p.lit > 0.3 ? '#ffb347' : undefined} />)}
        <Garland x0={-300} x1={W + 300} y={260} sag={140} seed={4} />
        {lanterns(300, 0.75, 9, 10)}
        {crowd > 0 && <Crowd n={Math.round(16 * crowd)} y={870} spread={40} s={0.5} seed={5} speed={36} lod={0} dim={p.amb} dimK={p.ambK} turnTo={turnTo} still={still} e={crowdE} />}
      </Layer>
      <FogPlane depth={0.7} color={p.fogNear} opacity={0.1} top={200} />
      <Layer depth={0.85}>
        <rect x={-2000} y={900} width={W + 4000} height={900} fill={p.ground} />
        {crowd > 0 && <Crowd n={Math.round(8 * crowd)} y={990} spread={40} s={0.78} seed={8} speed={44} lod={0} dim={p.amb} dimK={p.ambK} turnTo={turnTo} still={still} e={crowdE} />}
        <Smoke x={300} y={900} scale={1.2} color={tod === 'night' ? '#4a3a40' : '#a08070'} opacity={0.25} seed={6} rise={18} />
      </Layer>
      {children}
      {fg && (
        <Layer depth={1.5}>
          {lanterns(140, 1.6, 17, 5)}
          <Garland x0={-600} x1={W + 600} y={40} sag={200} seed={8} />
          {/* hanging cloth drapes at frame edges */}
          <path d="M -400 -200 L 240 -200 C 200 200 120 500 -60 700 L -400 700 Z" fill={mixColor('#5a1a2a', '#000', 0.4)} />
          <path d="M 1700 -200 L 2400 -200 L 2400 760 C 2100 560 1800 300 1700 -200 Z" fill={mixColor('#1a3a4a', '#000', 0.4)} />
        </Layer>
      )}
      <Layer depth={1.1}>
        <Particles n={60} seed={41} color={p.lit > 0.3 ? '#ffcf8a' : '#fff6e0'} size={[1, 2.6]} speed={[-4, -12]} wind={6} opacity={0.6} flicker />
      </Layer>
    </>
  );
};
