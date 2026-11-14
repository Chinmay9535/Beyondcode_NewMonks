import React from 'react';
import {Layer} from '../lib/camera';
import {W, H, rnd, useT, noise1, mixColor, clamp, lerp} from '../lib/util';
import {Glow, Flame, Particles, GodRays} from '../lib/fx';
import {Pothi} from '../lib/sets';

/** the emblem of the First Book: an eye inside a ring of crowd-heads */
export const Eye: React.FC<{x: number; y: number; r: number; color?: string; open?: number; look?: number; glow?: number}> = ({x, y, r, color = '#e23b3b', open = 1, look = 0, glow = 1}) => {
  const t = useT();
  const o = Math.max(0.05, open);
  return (
    <g transform={`translate(${x},${y})`} style={{filter: `drop-shadow(0 0 ${r * 0.12}px ${color})`}} opacity={glow}>
      <circle r={r} fill="none" stroke={color} strokeWidth={r * 0.03} />
      {Array.from({length: 18}).map((_, i) => {
        const a = (i / 18) * Math.PI * 2 + t * 0.05;
        return <circle key={i} cx={Math.cos(a) * r * 0.82} cy={Math.sin(a) * r * 0.82} r={r * 0.05} fill={color} opacity={0.8} />;
      })}
      <path d={`M ${-r * 0.55} 0 Q 0 ${-r * 0.42 * o} ${r * 0.55} 0 Q 0 ${r * 0.42 * o} ${-r * 0.55} 0 Z`} fill="none" stroke={color} strokeWidth={r * 0.04} />
      <clipPath id={`eyec${Math.round(r)}`}><path d={`M ${-r * 0.55} 0 Q 0 ${-r * 0.42 * o} ${r * 0.55} 0 Q 0 ${r * 0.42 * o} ${-r * 0.55} 0 Z`} /></clipPath>
      <g clipPath={`url(#eyec${Math.round(r)})`}>
        <circle cx={look * r * 0.2} r={r * 0.2} fill={color} />
        <circle cx={look * r * 0.2} r={r * 0.09} fill="#000" />
      </g>
    </g>
  );
};

/** the red First Book: a palm-leaf pothi bound in red cloth, opening */
export const RedBook: React.FC<{x: number; y: number; s?: number; open?: number; glow?: number}> = ({x, y, s = 1, open = 0, glow = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <Glow x={0} y={-40} r={420} color="#ff3a2a" opacity={0.35 * glow + open * 0.3} />
    <ellipse cx={0} cy={40} rx={320} ry={30} fill="#000" opacity={0.5} style={{filter: 'blur(10px)'}} />
    {/* red cloth wrap */}
    <path d="M -300 30 C -320 -10 -290 -60 -250 -60 L 250 -60 C 290 -60 320 -10 300 30 Z" fill="#7a1414" />
    {/* covers */}
    <rect x={-280} y={-40 - open * 30} width={560} height={30} rx={8} fill="#4a2410" />
    <rect x={-280} y={0} width={560} height={30} rx={8} fill="#4a2410" />
    {Array.from({length: 7}).map((_, i) => <rect key={i} x={-270} y={-8 - i * 4 - open * (i * 3)} width={540} height={5} rx={2} fill={mixColor('#c9a86a', '#ffd8a0', open)} />)}
    {open > 0 && (
      <g opacity={open}>
        <rect x={-260} y={-120 - open * 40} width={520} height={70} rx={6} fill="#d8b878" />
        <Eye x={-150} y={-85 - open * 40} r={28} />
        {Array.from({length: 3}).map((_, r) => <line key={r} x1={-100} y1={-105 - open * 40 + r * 18} x2={220 - r * 40} y2={-105 - open * 40 + r * 18} stroke="#5a1a10" strokeWidth={3} strokeDasharray="10 6" />)}
      </g>
    )}
    <line x1={-140} y1={-50} x2={-140} y2={40} stroke="#2a1608" strokeWidth={4} />
    <line x1={140} y1={-50} x2={140} y2={40} stroke="#2a1608" strokeWidth={4} />
    <Eye x={0} y={-25 - open * 30} r={26} glow={1 - open} />
  </g>
);

/** the Keeper's lamp-lit room: shelves of manuscripts, a lattice window, a low desk */
export const KeeperRoom: React.FC<{night?: number}> = ({night = 1}) => {
  const t = useT();
  const fl = 0.85 + 0.15 * noise1(t * 7, 3);
  return (
    <>
      <Layer depth={0.5}>
        <rect x={-1200} y={-800} width={W + 2400} height={H + 1600} fill={mixColor('#5a3a24', '#140c08', night)} />
        {/* lattice window */}
        <rect x={1260} y={160} width={340} height={420} fill={mixColor('#ffe8b0', '#1a2440', night)} />
        {Array.from({length: 7}).map((_, i) => <line key={i} x1={1260 + i * 56} y1={160} x2={1260 + i * 56} y2={580} stroke="#140c08" strokeWidth={8} />)}
        {Array.from({length: 8}).map((_, i) => <line key={'h' + i} x1={1260} y1={160 + i * 60} x2={1600} y2={160 + i * 60} stroke="#140c08" strokeWidth={8} />)}
        {/* shelves of palm-leaf books */}
        {Array.from({length: 4}).map((_, r) => (
          <g key={r}>
            <rect x={100} y={180 + r * 150} width={720} height={14} fill="#2a1608" />
            {Array.from({length: 9}).map((_, c) => <Pothi key={c} x={150 + c * 78} y={170 + r * 150} w={60} s={1} color={mixColor('#8a6a3a', '#c9a86a', rnd(r * 9 + c))} />)}
          </g>
        ))}
        <Glow x={1000} y={720} r={900} color="#ff9a40" opacity={0.35 * fl * night + 0.05} />
      </Layer>
      <Layer depth={0.75}>
        <rect x={-1200} y={860} width={W + 2400} height={800} fill={mixColor('#4a2a18', '#1a0e08', night)} />
        <Particles n={50} seed={61} color="#ffcf8a" size={[0.8, 2]} speed={[-3, -8]} wind={3} opacity={0.6} area={[300, 200, 1400, 700]} />
      </Layer>
    </>
  );
};

/** small lamp on a desk */
export const Lamp: React.FC<{x: number; y: number; s?: number; seed?: number}> = ({x, y, s = 1, seed = 1}) => (
  <g>
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M -60 0 C -50 32 50 32 72 -4 L 100 -12 C 80 -2 66 -6 58 -8 C 34 -12 -34 -12 -60 0 Z" fill="#5a2c14" />
      <ellipse cx={0} cy={34} rx={90} ry={8} fill="#000" opacity={0.5} />
    </g>
    <Flame x={x + 90 * s} y={y - 14 * s} s={s} seed={seed} />
  </g>
);
