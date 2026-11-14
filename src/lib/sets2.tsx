import React from 'react';
import {W, H, rnd, useT, noise1, lerp, clamp, mixColor} from './util';
import {Layer} from './camera';
import {Glow, Flame} from './fx';
import {Puppet, P, walk, Pose} from '../chars/puppet';
import {EX, Expr} from '../chars/face';
import {folk} from '../chars/cast2';

/** a coloured fog plane between parallax layers: atmospheric perspective */
export const FogPlane: React.FC<{depth: number; color: string; opacity: number; top?: number; fade?: number}> = ({depth, color, opacity, top = -2000, fade = 0}) => (
  <Layer depth={depth}>
    {fade > 0 ? (
      <>
        <defs>
          <linearGradient id={`fp${Math.round(depth * 100)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0} />
            <stop offset={fade} stopColor={color} stopOpacity={opacity} />
            <stop offset="1" stopColor={color} stopOpacity={opacity} />
          </linearGradient>
        </defs>
        <rect x={-3000} y={top} width={W + 6000} height={6000} fill={`url(#fp${Math.round(depth * 100)})`} />
      </>
    ) : (
      <rect x={-3000} y={top} width={W + 6000} height={6000} fill={color} opacity={opacity} />
    )}
  </Layer>
);

/** hanging paper/cloth lantern */
export const Lantern: React.FC<{x: number; y: number; s?: number; color?: string; seed?: number; lit?: number}> = ({x, y, s = 1, color = '#ffb347', seed = 1, lit = 1}) => {
  const t = useT();
  const sw = Math.sin(t * 1.3 + seed) * 4;
  const fl = 0.85 + 0.15 * noise1(t * 6, seed);
  return (
    <g transform={`translate(${x},${y}) rotate(${sw}) scale(${s})`}>
      <line x1={0} y1={-200} x2={0} y2={-30} stroke="#1a0e08" strokeWidth={2} />
      {lit > 0 && <Glow x={0} y={10} r={150} color={color} opacity={0.5 * fl * lit} />}
      <path d="M -22 -30 L 22 -30 C 34 -10 34 30 22 50 L -22 50 C -34 30 -34 -10 -22 -30 Z" fill={mixColor('#3a1a0a', color, lit * fl)} />
      <path d="M -8 -28 C -14 0 -14 30 -8 48 M 8 -28 C 14 0 14 30 8 48" stroke="#5a2a0a" strokeWidth={2} fill="none" opacity={0.6} />
      <rect x={-14} y={-36} width={28} height={8} fill="#2a1408" />
      <rect x={-14} y={50} width={28} height={6} fill="#2a1408" />
      <line x1={0} y1={56} x2={0} y2={78} stroke="#b0302a" strokeWidth={3} />
    </g>
  );
};

/** a market stall: posts, striped awning, goods */
export const Stall: React.FC<{x: number; y: number; w?: number; s?: number; c1: string; c2: string; goods?: number; seed?: number; light?: string}> = ({x, y, w = 360, s = 1, c1, c2, goods = 0, seed = 1, light}) => {
  const t = useT();
  const flap = Math.sin(t * 1.7 + seed) * 4;
  const stripes = 8;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {light && <Glow x={0} y={-120} r={w * 0.9} color={light} opacity={0.35} />}
      <rect x={-w / 2} y={-250} width={10} height={250} fill="#2a160c" />
      <rect x={w / 2 - 10} y={-250} width={10} height={250} fill="#2a160c" />
      {/* awning */}
      {Array.from({length: stripes}).map((_, i) => {
        const x0 = -w / 2 - 20 + (i * (w + 40)) / stripes, x1 = x0 + (w + 40) / stripes;
        return <path key={i} d={`M ${x0} -290 L ${x1} -290 L ${x1 + 6} ${-226 + flap} Q ${(x0 + x1) / 2 + 3} ${-212 + flap} ${x0 + 6} ${-226 + flap} Z`} fill={i % 2 ? c1 : c2} />;
      })}
      <path d={`M ${-w / 2 - 20} -290 L ${w / 2 + 20} -290 L ${w / 2} -320 L ${-w / 2} -320 Z`} fill={mixColor(c1, '#000', 0.35)} />
      {/* counter */}
      <rect x={-w / 2} y={-100} width={w} height={100} fill="#3a2010" />
      <rect x={-w / 2 - 6} y={-106} width={w + 12} height={12} fill="#5a3418" />
      {/* goods: spice heaps, pots, cloth bolts */}
      {goods === 0 && ['#c8322a', '#e8a02a', '#7a8a2a', '#c86a2a', '#e8d070'].map((c, i) => (
        <path key={i} d={`M ${-w / 2 + 30 + i * (w - 60) / 5} -106 q ${(w - 60) / 10} -60 ${(w - 60) / 5 - 10} 0 Z`} fill={c} />
      ))}
      {goods === 1 && Array.from({length: 6}).map((_, i) => <g key={i}><ellipse cx={-w / 2 + 40 + i * (w - 80) / 5} cy={-140} rx={26} ry={34} fill={mixColor('#8a4a2a', '#c86a3a', rnd(i + seed))} /><rect x={-w / 2 + 28 + i * (w - 80) / 5} y={-178} width={24} height={10} fill="#5a2a14" /></g>)}
      {goods === 2 && Array.from({length: 7}).map((_, i) => <rect key={i} x={-w / 2 + 20 + i * (w - 40) / 7} y={-200} width={(w - 40) / 7 - 6} height={94} fill={['#8a2a4a', '#2a6a7a', '#e8c25a', '#6a2a8a', '#c8502a', '#2a8a5a', '#e8e0d0'][i]} rx={4} />)}
    </g>
  );
};

/** marigold garland strung across the street */
export const Garland: React.FC<{x0: number; x1: number; y: number; sag?: number; seed?: number}> = ({x0, x1, y, sag = 120, seed = 1}) => {
  const t = useT();
  const n = 26;
  const items = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(x0, x1, u), yy = y + Math.sin(u * Math.PI) * sag + Math.sin(t * 1.2 + u * 3 + seed) * 4;
    items.push(<circle key={i} cx={x} cy={yy} r={9} fill={i % 3 === 0 ? '#e85a1a' : '#f2a81a'} />);
  }
  return <g>{items}</g>;
};

/** a lane of walking townsfolk (low-detail heads), sorted by depth */
export const Crowd: React.FC<{n: number; y: number; spread?: number; s?: number; seed?: number; speed?: number; x0?: number; x1?: number; lod?: number; dim?: string; dimK?: number; turnTo?: number; still?: number; e?: Expr; standing?: number}> = ({
  n, y, spread = 60, s = 0.7, seed = 1, speed = 40, x0 = -400, x1 = W + 400, lod = 0, dim, dimK = 0, turnTo, still = 0, e, standing = 0.3,
}) => {
  const t = useT();
  const people = Array.from({length: n}).map((_, i) => {
    const r = rnd(seed * 31 + i);
    const dir = r > 0.5 ? 1 : -1;
    const stand = rnd(seed * 17 + i) < standing;
    const span = x1 - x0;
    const sp = stand ? 0 : speed * (0.6 + rnd(i * 3 + seed) * 0.7) * (1 - still);
    const x = x0 + (((rnd(seed * 7 + i) * span + dir * t * sp) % span) + span) % span;
    const yy = y + (rnd(seed * 5 + i) - 0.5) * spread;
    return {i, x, y: yy, dir, stand, sp};
  }).sort((a, b) => a.y - b.y);
  return (
    <g>
      {people.map((p) => {
        const f = folk(seed * 13 + p.i);
        const L = dim ? {...f.L, ambient: dim, ambientK: dimK} : f.L;
        const pose: Pose = p.stand ? {...P.stand, headTilt: Math.sin(t + p.i) * 3} : walk(P.stand, t * 5.5 * (p.sp / 40) + p.i, 0.8);
        const sc = s * (0.85 + (p.y - y + spread / 2) / spread * 0.3);
        const turn = turnTo !== undefined ? turnTo : p.dir * 0.5;
        return <Puppet key={p.i} id={`cr${seed}_${p.i}`} L={L} outfit={f.fit} pose={pose} e={e ?? EX.neutral} x={p.x} y={p.y} s={sc} dir={turnTo !== undefined ? 1 : p.dir} turn={turn} seed={p.i} lod={lod} shadow={0.3} />;
      })}
    </g>
  );
};

/** thatched village hut */
export const Hut: React.FC<{x: number; y: number; s?: number; wall?: string; roof?: string; lit?: boolean}> = ({x, y, s = 1, wall = '#8a5a3a', roof = '#6a5a2a', lit}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-120} y={-150} width={240} height={150} fill={wall} />
    <rect x={-120} y={-150} width={120} height={150} fill="#000" opacity={0.18} />
    <rect x={-26} y={-90} width={52} height={90} fill={lit ? '#ffb347' : '#1a0e08'} />
    {lit && <Glow x={0} y={-40} r={160} color="#ffb347" opacity={0.4} />}
    <path d="M -160 -140 L 0 -270 L 160 -140 Z" fill={roof} />
    {Array.from({length: 9}).map((_, i) => <line key={i} x1={-150 + i * 37} y1={-142} x2={-10 + i * 3} y2={-262} stroke="#000" opacity={0.15} strokeWidth={3} />)}
  </g>
);

/** palm / tree silhouette */
export const Palm: React.FC<{x: number; y: number; h?: number; color: string; seed?: number}> = ({x, y, h = 520, color, seed = 1}) => {
  const t = useT();
  const bend = 20 + rnd(seed) * 40;
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M -8 0 C 0 ${-h * 0.4} ${bend * 0.5} ${-h * 0.75} ${bend} ${-h} L ${bend + 10} ${-h} C ${bend * 0.5 + 12} ${-h * 0.75} 14 ${-h * 0.4} 10 0 Z`} fill={color} />
      {Array.from({length: 8}).map((_, j) => {
        const a = -Math.PI / 2 + (j - 3.5) * 0.45 + Math.sin(t * 0.9 + j + seed) * 0.05;
        const L = 180 + rnd(seed * 3 + j) * 60;
        return <path key={j} d={`M ${bend + 5} ${-h} Q ${bend + 5 + Math.cos(a) * L * 0.6} ${-h + Math.sin(a) * L * 0.6 - 30} ${bend + 5 + Math.cos(a) * L} ${-h + Math.sin(a) * L + 70}`} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
};

/** the Dhauli rock with the elephant emerging from it (Kalinga edict site, Odisha) */
export const DhauliRock: React.FC<{x: number; y: number; s?: number; c?: string; hi?: string; glyphK?: number}> = ({x, y, s = 1, c = '#6a6258', hi = '#b8a890', glyphK = 0}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -520 0 C -540 -180 -460 -330 -260 -360 C -60 -390 200 -380 380 -320 C 520 -270 560 -120 540 0 Z" fill={c} />
    <path d="M -480 -60 C -460 -220 -360 -320 -200 -340" stroke={hi} strokeWidth={10} fill="none" opacity={0.35} />
    {/* the carved elephant's forepart on top of the rock */}
    <g transform="translate(150, -360)">
      <path d="M -150 20 C -160 -90 -60 -170 40 -160 C 120 -150 170 -100 170 -30 C 170 10 150 40 120 50 L 110 20 C 100 60 96 90 100 120 L 70 120 C 66 90 66 60 70 30 L -60 30 Z" fill={mixColor(c, '#000', 0.08)} />
      <path d="M 150 -40 C 190 -10 196 60 180 110 L 160 110 C 170 60 164 10 140 -10 Z" fill={mixColor(c, '#000', 0.12)} />
      <path d="M 40 -150 C 0 -120 -10 -60 30 -30 C 70 -50 80 -110 40 -150 Z" fill={mixColor(c, '#000', 0.2)} />
      <circle cx={110} cy={-90} r={6} fill="#2a2420" />
      <path d="M -150 20 C -160 -90 -60 -170 40 -160" stroke={hi} strokeWidth={6} fill="none" opacity={0.4} />
    </g>
    {/* the edict text panel */}
    <rect x={-380} y={-280} width={480} height={230} fill="#000" opacity={0.08} />
    {Array.from({length: 9}).map((_, r) => (
      <g key={r}>{Array.from({length: 22}).map((_, k) => {
        const gx = -360 + k * 21, gy = -250 + r * 24, kk = Math.floor(rnd(r * 40 + k) * 4);
        const d = kk === 0 ? `M ${gx} ${gy} l 0 -14 m -5 7 l 10 0` : kk === 1 ? `M ${gx - 5} ${gy} l 5 -14 l 5 14` : kk === 2 ? `M ${gx - 5} ${gy - 14} l 0 14 l 10 0` : `M ${gx} ${gy - 7} m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0`;
        return <path key={k} d={d} stroke={glyphK > 0 ? mixColor('#2a2420', '#ffcf7a', glyphK) : '#2a2420'} strokeWidth={2.4} fill="none" />;
      })}</g>
    ))}
  </g>
);

/** granary: a big mud storehouse */
export const Granary: React.FC<{x: number; y: number; s?: number; c?: string; open?: number}> = ({x, y, s = 1, c = '#9a6a42', open = 0}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -260 0 L -240 -300 Q 0 -380 240 -300 L 260 0 Z" fill={c} />
    <path d="M -260 0 L -240 -300 Q -120 -340 0 -350 L 0 0 Z" fill="#000" opacity={0.15} />
    <path d="M -300 -290 Q 0 -460 300 -290 Q 0 -400 -300 -290 Z" fill="#6a5a2a" />
    <rect x={-60} y={-170} width={120} height={170} fill="#1a0e08" />
    <path d={`M -60 -170 L ${-60 - open * 50} -160 L ${-60 - open * 50} 10 L -60 0 Z`} fill="#5a3418" />
    {Array.from({length: 12}).map((_, i) => <ellipse key={i} cx={-200 + (i % 6) * 80} cy={-14 - Math.floor(i / 6) * 34} rx={34} ry={20} fill="#c8a868" opacity={1 - open} />)}
  </g>
);
