import React from 'react';
import {W, H, fbm, rnd, useT, noise1, lerp, clamp, mixColor} from './util';

/* ---------------- sky ---------------- */
export const Sky: React.FC<{stops: [number, string][]; id: string}> = ({stops, id}) => (
  <g>
    <defs>
      <linearGradient id={id} x1={0} y1={0} x2={0} y2={1}>
        {stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
      </linearGradient>
    </defs>
    <rect x={-2000} y={-1500} width={W + 4000} height={H + 3000} fill={`url(#${id})`} />
  </g>
);

export const Sun: React.FC<{x: number; y: number; r: number; color: string; glow?: string; haze?: number}> = ({x, y, r, color, glow, haze = 1}) => {
  const id = `sun${Math.round(x)}${Math.round(y)}`;
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={glow ?? color} stopOpacity={0.9 * haze} />
          <stop offset="0.2" stopColor={glow ?? color} stopOpacity={0.35 * haze} />
          <stop offset="1" stopColor={glow ?? color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r * 9} fill={`url(#${id})`} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
};

export const Stars: React.FC<{n?: number; seed?: number; rot?: number; cx?: number; cy?: number; trail?: number; opacity?: number}> = ({n = 220, seed = 3, rot = 0, cx = W / 2, cy = -400, trail = 0, opacity = 1}) => {
  const t = useT();
  const items = [];
  for (let i = 0; i < n; i++) {
    const r = 200 + rnd(seed + i) * 2200;
    const a = rnd(seed * 3 + i) * Math.PI * 2 + rot;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (y > H + 50 || x < -300 || x > W + 300) continue;
    const s = 0.6 + rnd(seed * 7 + i) ** 3 * 2.4;
    const tw = 0.55 + 0.45 * noise1(t * 2 + i, seed);
    if (trail > 0) {
      const a2 = a - trail;
      const large = trail > Math.PI ? 1 : 0;
      items.push(<path key={i} d={`M ${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`} stroke="#dfe8ff" strokeWidth={s * 0.8} fill="none" opacity={0.5 * tw * opacity} />);
    } else items.push(<circle key={i} cx={x} cy={y} r={s} fill="#eef3ff" opacity={tw * opacity} />);
  }
  return <g>{items}</g>;
};

/* ---------------- terrain ---------------- */
export const Ridge: React.FC<{y: number; amp: number; color: string; seed?: number; freq?: number; x0?: number; x1?: number; sharp?: boolean; bottom?: number}> = ({
  y, amp, color, seed = 1, freq = 0.004, x0 = -1500, x1 = W + 1500, sharp, bottom = H + 1500,
}) => {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 24) {
    let v = fbm(x * freq, seed, 5);
    if (sharp) v = 1 - Math.abs(v * 2 - 1);
    pts.push(`${x},${(y - v * amp).toFixed(1)}`);
  }
  return <polygon points={`${x0},${bottom} ${pts.join(' ')} ${x1},${bottom}`} fill={color} />;
};

export const Clouds: React.FC<{y: number; color: string; seed?: number; n?: number; speed?: number; opacity?: number; scale?: number}> = ({y, color, seed = 1, n = 7, speed = 6, opacity = 0.6, scale = 1}) => {
  const t = useT();
  const cl = [];
  for (let i = 0; i < n; i++) {
    const x = ((rnd(seed + i) * 3400 + t * speed * (0.5 + rnd(i + seed * 2))) % 3400) - 700;
    const yy = y + (rnd(seed * 5 + i) - 0.5) * 140 * scale;
    const w = (260 + rnd(i * 3 + seed) * 420) * scale;
    cl.push(
      <g key={i} opacity={opacity * (0.5 + rnd(i + 99) * 0.5)}>
        <ellipse cx={x} cy={yy} rx={w} ry={w * 0.18} fill={color} />
        <ellipse cx={x - w * 0.3} cy={yy - w * 0.08} rx={w * 0.45} ry={w * 0.14} fill={color} />
        <ellipse cx={x + w * 0.25} cy={yy - w * 0.1} rx={w * 0.35} ry={w * 0.16} fill={color} />
      </g>,
    );
  }
  return <g style={{filter: `blur(${10 * scale}px)`}}>{cl}</g>;
};

/* ---------------- water ---------------- */
export const River: React.FC<{y: number; h: number; color: string; hi: string; seed?: number; x0?: number; x1?: number; speed?: number}> = ({y, h, color, hi, seed = 1, x0 = -1200, x1 = W + 1200, speed = 30}) => {
  const t = useT();
  const lines = [];
  for (let i = 0; i < 40; i++) {
    const yy = y + rnd(seed + i) * h;
    const len = 40 + rnd(i * 3 + seed) * 160 * (0.4 + (yy - y) / h);
    const x = x0 + ((rnd(i * 7 + seed) * (x1 - x0) + t * speed * (0.5 + (yy - y) / h)) % (x1 - x0));
    lines.push(<rect key={i} x={x} y={yy} width={len} height={1.5 + (yy - y) / h * 3} fill={hi} opacity={0.25 + 0.5 * noise1(t * 1.5 + i, seed)} rx={2} />);
  }
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={h} fill={color} />
      {lines}
    </g>
  );
};

/* ---------------- architecture ---------------- */
/** Pataliputra skyline: timber palisade, towers, domed halls, stupas */
export const CitySkyline: React.FC<{y: number; color: string; window?: string; seed?: number; x0?: number; x1?: number; scale?: number}> = ({y, color, window, seed = 4, x0 = -400, x1 = W + 400, scale = 1}) => {
  const els = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const kind = Math.floor(rnd(seed + i) * 5);
    const w = (60 + rnd(seed * 2 + i) * 120) * scale;
    const h = (60 + rnd(seed * 3 + i) * 140) * scale;
    if (kind === 0) {
      // barrel-vaulted hall (chaitya roof)
      els.push(<path key={i} d={`M ${x} ${y} L ${x} ${y - h} Q ${x + w / 2} ${y - h - w * 0.7} ${x + w} ${y - h} L ${x + w} ${y} Z`} fill={color} />);
    } else if (kind === 1) {
      // stupa dome with harmika
      els.push(<g key={i}><path d={`M ${x} ${y} L ${x} ${y - h * 0.3} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y - h * 0.3} L ${x + w} ${y} Z`} fill={color} /><rect x={x + w / 2 - 6 * scale} y={y - h * 0.3 - w / 2 - 22 * scale} width={12 * scale} height={24 * scale} fill={color} /><rect x={x + w / 2 - 14 * scale} y={y - h * 0.3 - w / 2 - 30 * scale} width={28 * scale} height={8 * scale} fill={color} /></g>);
    } else if (kind === 2) {
      // tiered wooden tower
      const tiers = 3;
      const parts = [];
      for (let k = 0; k < tiers; k++) {
        const ww = w * (1 - k * 0.22), xx = x + (w - ww) / 2, hh = h * 0.45;
        parts.push(<path key={k} d={`M ${xx - 10 * scale} ${y - k * hh} L ${xx + ww / 2} ${y - k * hh - hh * 0.9} L ${xx + ww + 10 * scale} ${y - k * hh} Z`} fill={color} />);
        parts.push(<rect key={'r' + k} x={xx + ww * 0.15} y={y - k * hh - 2} width={ww * 0.7} height={hh * 0.3 + 2} fill={color} />);
      }
      els.push(<g key={i}>{parts}</g>);
    } else {
      // flat-roofed houses with palisade
      els.push(<rect key={i} x={x} y={y - h * 0.5} width={w} height={h * 0.5} fill={color} />);
    }
    if (window && rnd(i + seed * 9) > 0.45) els.push(<rect key={'w' + i} x={x + w * 0.4} y={y - h * 0.35} width={6 * scale} height={10 * scale} fill={window} />);
    x += w * (0.7 + rnd(i + 5) * 0.5);
    i++;
  }
  // palisade wall
  const posts = [];
  for (let px = x0; px < x1; px += 14 * scale) posts.push(<path key={px} d={`M ${px} ${y + 4} L ${px} ${y - 46 * scale} L ${px + 6 * scale} ${y - 54 * scale} L ${px + 12 * scale} ${y - 46 * scale} L ${px + 12 * scale} ${y + 4} Z`} fill={color} />);
  return <g>{els}{posts}</g>;
};

/** Polished Mauryan pillar with bell capital (and optional lion) */
export const Pillar: React.FC<{x: number; y: number; h: number; w?: number; color: string; hi?: string; lion?: boolean; wheel?: boolean}> = ({x, y, h, w = 40, color, hi, lion, wheel}) => (
  <g>
    <path d={`M ${x - w / 2} ${y} L ${x - w * 0.42} ${y - h} L ${x + w * 0.42} ${y - h} L ${x + w / 2} ${y} Z`} fill={color} />
    {hi && <path d={`M ${x - w * 0.1} ${y} L ${x - w * 0.06} ${y - h} L ${x + w * 0.08} ${y - h} L ${x + w * 0.1} ${y} Z`} fill={hi} opacity={0.35} />}
    {/* inverted lotus bell */}
    <path d={`M ${x - w * 0.42} ${y - h} C ${x - w * 0.9} ${y - h - w * 0.3} ${x - w * 0.8} ${y - h - w * 1.1} ${x - w * 0.5} ${y - h - w * 1.2} L ${x + w * 0.5} ${y - h - w * 1.2} C ${x + w * 0.8} ${y - h - w * 1.1} ${x + w * 0.9} ${y - h - w * 0.3} ${x + w * 0.42} ${y - h} Z`} fill={color} />
    <rect x={x - w * 0.75} y={y - h - w * 1.6} width={w * 1.5} height={w * 0.42} fill={color} />
    {wheel && (
      <g>
        <circle cx={x} cy={y - h - w * 1.39} r={w * 0.17} fill="none" stroke={hi ?? '#fff'} strokeWidth={2} opacity={0.6} />
      </g>
    )}
    {lion && (
      <g>
        {[-1, 0, 1].map((k) => (
          <g key={k} transform={`translate(${x + k * w * 0.42}, ${y - h - w * 1.6})`}>
            <path d={`M ${-w * 0.32} 0 L ${-w * 0.3} ${-w * 0.9} Q ${-w * 0.42} ${-w * 1.35} ${-w * 0.05} ${-w * 1.5} Q ${w * 0.4} ${-w * 1.4} ${w * 0.32} ${-w * 0.9} L ${w * 0.32} 0 Z`} fill={color} />
            <path d={`M ${-w * 0.2} ${-w * 1.35} Q ${-w * 0.05} ${-w * 1.62} ${w * 0.14} ${-w * 1.38}`} fill={color} />
          </g>
        ))}
      </g>
    )}
  </g>
);

/** Ashoka chakra (24 spokes) */
export const Chakra: React.FC<{x: number; y: number; r: number; color: string; rot?: number; sw?: number; opacity?: number}> = ({x, y, r, color, rot = 0, sw = 4, opacity = 1}) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`} opacity={opacity}>
    <circle r={r} fill="none" stroke={color} strokeWidth={sw * 1.6} />
    <circle r={r * 0.14} fill={color} />
    {Array.from({length: 24}).map((_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return <g key={i}>
        <line x1={Math.cos(a) * r * 0.14} y1={Math.sin(a) * r * 0.14} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke={color} strokeWidth={sw * 0.6} />
        <circle cx={Math.cos(a + Math.PI / 24) * r * 0.97} cy={Math.sin(a + Math.PI / 24) * r * 0.97} r={sw * 0.8} fill={color} />
      </g>;
    })}
  </g>
);

/* ---------------- people & beasts (silhouettes) ---------------- */
/** foot soldier with spear and shield. dir 1 = facing right */
export const Soldier: React.FC<{x: number; y: number; s?: number; color: string; dir?: number; phase?: number; spear?: boolean; rim?: string; walk?: number}> = ({x, y, s = 1, color, dir = 1, phase = 0, spear = true, rim, walk = 1}) => {
  const t = useT();
  const p = t * 5 * walk + phase;
  const bob = Math.abs(Math.sin(p)) * 4 * walk;
  const l1 = Math.sin(p) * 14 * walk, l2 = -l1;
  return (
    <g transform={`translate(${x},${y - bob * s}) scale(${s * dir},${s})`}>
      <path d={`M -5 -50 L ${-6 + l1} 0 L ${-1 + l1} 0 L 1 -46 Z`} fill={color} />
      <path d={`M 4 -50 L ${3 + l2} 0 L ${8 + l2} 0 L 8 -46 Z`} fill={color} />
      <path d="M -10 -52 C -12 -80 -8 -98 0 -100 C 10 -98 13 -80 11 -52 Z" fill={color} />
      <circle cx={1} cy={-108} r={9} fill={color} />
      <path d="M -9 -110 Q 1 -126 11 -110 Z" fill={color} />
      <ellipse cx={13} cy={-74} rx={9} ry={20} fill={color} />
      {spear && <line x1={-4} y1={-20} x2={10} y2={-170} stroke={color} strokeWidth={2.6} />}
      {spear && <path d="M 9.4 -168 L 13 -186 L 15 -168 Z" fill={color} />}
      {rim && <path d="M 11 -52 C 13 -80 10 -98 0 -100" stroke={rim} strokeWidth={2} fill="none" opacity={0.8} />}
    </g>
  );
};

/** war elephant with armour + howdah */
export const Elephant: React.FC<{x: number; y: number; s?: number; color: string; dir?: number; phase?: number; rim?: string; walk?: number; banner?: string}> = ({x, y, s = 1, color, dir = 1, phase = 0, rim, walk = 1, banner}) => {
  const t = useT();
  const p = t * 2.2 * walk + phase;
  const sway = Math.sin(p) * 6 * walk;
  const trunk = Math.sin(t * 1.3 + phase) * 8;
  const leg = (lx: number, ph: number) => {
    const sw = Math.sin(p + ph) * 12 * walk;
    return <path d={`M ${lx - 16} -60 L ${lx - 14 + sw} 0 L ${lx + 14 + sw} 0 L ${lx + 16} -60 Z`} fill={color} />;
  };
  return (
    <g transform={`translate(${x},${y - Math.abs(Math.sin(p)) * 3}) scale(${s * dir},${s})`}>
      {leg(-70, 0)}{leg(-40, Math.PI)}{leg(60, Math.PI)}{leg(85, 0)}
      <path d="M -110 -70 C -120 -150 -40 -190 40 -180 C 110 -172 140 -130 130 -70 C 110 -50 -90 -45 -110 -70 Z" fill={color} />
      {/* head + trunk */}
      <path d={`M 110 -150 C 150 -190 200 -170 205 -120 C 208 -90 196 -70 190 -40 C 186 -10 ${190 + trunk} 10 ${200 + trunk} 30 L ${185 + trunk} 32 C 172 0 170 -30 160 -60 C 140 -70 120 -90 110 -150 Z`} fill={color} />
      {/* ear */}
      <path d="M 130 -160 C 100 -170 90 -100 120 -80 C 140 -90 150 -130 130 -160 Z" fill={mixColor(color, '#000', 0.25)} />
      {/* tusk */}
      <path d="M 185 -70 C 210 -60 228 -70 236 -90 C 226 -74 206 -66 186 -78 Z" fill="#e8e0cc" opacity={0.9} />
      {/* howdah */}
      <path d={`M -60 -182 L -50 ${-250 + sway * 0.3} L 50 ${-250 + sway * 0.3} L 60 -182 Z`} fill={color} />
      <path d={`M -64 ${-252 + sway * 0.3} Q 0 ${-300 + sway * 0.3} 64 ${-252 + sway * 0.3} Z`} fill={color} />
      {/* archer in howdah */}
      <circle cx={10} cy={-276 + sway * 0.3} r={11} fill={color} />
      <path d={`M 0 ${-268 + sway * 0.3} L 0 ${-245 + sway * 0.3} L 22 ${-245 + sway * 0.3} L 20 ${-266 + sway * 0.3} Z`} fill={color} />
      <path d={`M 30 ${-320 + sway * 0.3} Q 52 ${-275 + sway * 0.3} 30 ${-230 + sway * 0.3}`} stroke={color} strokeWidth={3} fill="none" />
      {/* armour caparison */}
      <path d="M -100 -120 C -40 -110 40 -110 120 -125 L 118 -80 C 40 -70 -40 -70 -102 -80 Z" fill={banner ?? mixColor(color, '#000', 0.2)} opacity={banner ? 0.9 : 1} />
      {banner && <line x1={-40} y1={-250} x2={-40} y2={-400} stroke={color} strokeWidth={4} />}
      {banner && <Banner x={-40} y={-400} w={80} h={46} color={banner} />}
      {rim && <path d="M -110 -70 C -120 -150 -40 -190 40 -180 C 110 -172 140 -130 130 -70" stroke={rim} strokeWidth={3} fill="none" opacity={0.7} />}
    </g>
  );
};

export const Banner: React.FC<{x: number; y: number; w: number; h: number; color: string; phase?: number}> = ({x, y, w, h, color, phase = 0}) => {
  const t = useT();
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    pts.push([x + u * w, y + Math.sin(t * 4 + u * 5 + phase) * 6 * u]);
  }
  const bot = pts.slice().reverse().map(([px, py]) => `${px},${py + h * (1 - 0.25 * ((px - x) / w))}`);
  return <polygon points={`${pts.map(([px, py]) => `${px},${py}`).join(' ')} ${bot.join(' ')}`} fill={color} />;
};

/** horse with rider (Ashoka on horseback) */
export const Rider: React.FC<{x: number; y: number; s?: number; color: string; dir?: number; sword?: number; rearing?: number; rim?: string; turban?: boolean}> = ({x, y, s = 1, color, dir = 1, sword = 0, rearing = 0, rim, turban}) => {
  const t = useT();
  const mane = Math.sin(t * 6) * 4;
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
      <g transform={`rotate(${-rearing * 22}, -60, -10)`}>
        {/* legs */}
        <path d="M -70 -90 L -86 -20 L -78 0 L -70 0 L -74 -24 L -56 -86 Z" fill={color} />
        <path d="M -50 -90 L -40 -40 L -56 0 L -48 0 L -28 -42 L -34 -90 Z" fill={color} />
        <path d={`M 50 -90 L ${60 - rearing * 30} ${-40 - rearing * 40} L ${50 - rearing * 10} ${0 - rearing * 50} L ${58 - rearing * 10} ${0 - rearing * 50} L ${72 - rearing * 30} ${-42 - rearing * 40} L 66 -90 Z`} fill={color} />
        <path d={`M 70 -92 L ${86 - rearing * 20} ${-30 - rearing * 50} L ${80 - rearing * 4} ${0 - rearing * 60} L ${88 - rearing * 4} ${0 - rearing * 60} L ${98 - rearing * 20} ${-34 - rearing * 50} L 86 -92 Z`} fill={color} />
        {/* body */}
        <path d="M -90 -100 C -96 -140 -60 -150 0 -146 C 60 -150 90 -140 96 -100 C 80 -80 -70 -80 -90 -100 Z" fill={color} />
        {/* neck + head */}
        <path d="M 70 -140 C 90 -190 120 -220 140 -224 C 160 -220 170 -200 166 -186 L 150 -180 C 140 -170 120 -150 100 -110 Z" fill={color} />
        <path d={`M 120 -214 C 100 ${-200 + mane} 86 ${-170 + mane} 72 -140`} stroke={color} strokeWidth={10} fill="none" />
        {/* tail */}
        <path d={`M -90 -120 C -120 ${-110 + mane} -126 ${-80 + mane} -120 -50`} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" />
        {/* rider */}
        <path d="M -16 -146 L -6 -210 L 22 -210 L 26 -146 Z" fill={color} />
        <path d="M -4 -150 L 20 -100 L 30 -104 L 12 -150 Z" fill={color} />
        <circle cx={8} cy={-226} r={14} fill={color} />
        {turban && <path d="M -8 -232 C -10 -262 26 -262 24 -232 Z" fill={color} />}
        {turban && <path d="M 4 -258 C 0 -276 18 -280 14 -258 Z" fill={color} />}
        {/* sword arm */}
        <g transform={`rotate(${-sword * 120}, 16, -200)`}>
          <path d="M 12 -204 L 60 -196 L 60 -188 L 12 -194 Z" fill={color} />
          <path d="M 58 -198 L 160 -210 L 162 -204 L 58 -190 Z" fill={color} />
        </g>
        {rim && <path d="M -90 -100 C -96 -140 -60 -150 0 -146 C 60 -150 90 -140 96 -100" stroke={rim} strokeWidth={3} fill="none" opacity={0.7} />}
      </g>
    </g>
  );
};

/** chariot */
export const Chariot: React.FC<{x: number; y: number; s?: number; color: string; dir?: number}> = ({x, y, s = 1, color, dir = 1}) => {
  const t = useT();
  const spin = t * 400;
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
      <path d="M -60 -60 L -50 -110 L 20 -110 L 30 -60 Z" fill={color} />
      <line x1={30} y1={-70} x2={150} y2={-80} stroke={color} strokeWidth={5} />
      <g transform={`translate(-15,-40) rotate(${spin})`}>
        <circle r={40} fill="none" stroke={color} strokeWidth={6} />
        {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={0} y1={0} x2={Math.cos(i) * 40} y2={Math.sin(i) * 40} stroke={color} strokeWidth={3} />)}
      </g>
      <Soldier x={-10} y={-100} s={0.8} color={color} walk={0} />
      <g transform="translate(120,0)"><Rider x={0} y={0} s={0.0} color={color} /></g>
      {/* horses */}
      {[0, 1].map((k) => {
        const g = Math.sin(t * 9 + k) * 18;
        return (
          <g key={k} transform={`translate(${170 + k * 20}, ${-k * 4})`}>
            <path d={`M -50 -60 C -54 -90 -20 -96 20 -94 C 50 -96 60 -80 58 -60 C 40 -50 -40 -50 -50 -60 Z`} fill={color} />
            <path d="M 40 -88 C 54 -120 74 -136 88 -134 L 96 -120 L 82 -118 C 74 -100 64 -80 54 -66 Z" fill={color} />
            <path d={`M -40 -60 L ${-50 + g} 0 L ${-42 + g} 0 L -28 -60 Z M 36 -62 L ${46 - g} 0 L ${54 - g} 0 L 48 -62 Z`} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

/** generic standing / walking robed figure (full body, no face detail) */
export const Robed: React.FC<{x: number; y: number; s?: number; color: string; dir?: number; walk?: number; hood?: boolean; bow?: number; turban?: boolean; rim?: string; phase?: number}> = ({x, y, s = 1, color, dir = 1, walk = 0, hood, bow = 0, turban, rim, phase = 0}) => {
  const t = useT();
  const p = t * 3.2 + phase;
  const sw = Math.sin(p) * 10 * walk;
  return (
    <g transform={`translate(${x},${y - Math.abs(Math.sin(p)) * 3 * walk}) scale(${s * dir},${s})`}>
      <g transform={`rotate(${bow * 25}, 0, -90)`}>
        <path d={`M -36 0 C -34 -60 -30 -130 -24 -170 C -20 -190 20 -190 26 -170 C 32 -130 36 -60 ${38 + sw} 0 Z`} fill={color} />
        {hood ? (
          <path d="M -26 -168 C -34 -220 -10 -238 2 -238 C 22 -236 34 -214 28 -168 Z" fill={color} />
        ) : (
          <circle cx={2} cy={-204} r={22} fill={color} />
        )}
        {turban && <path d="M -22 -212 C -24 -246 28 -246 26 -212 Z" fill={color} />}
        {rim && <path d={`M 26 -170 C 32 -130 36 -60 ${38 + sw} 0`} stroke={rim} strokeWidth={3} fill="none" opacity={0.8} />}
        {rim && hood && <path d="M 2 -238 C 22 -236 34 -214 28 -168" stroke={rim} strokeWidth={3} fill="none" opacity={0.8} />}
      </g>
    </g>
  );
};

/** seated hooded figure seen from the side/back, with lamp rim-light */
export const SeatedHood: React.FC<{x: number; y: number; s?: number; color: string; rim?: string; rimSide?: number; breathe?: number}> = ({x, y, s = 1, color, rim, rimSide = 1, breathe = 0}) => {
  const t = useT();
  const b = Math.sin(t * 1.4 + breathe) * 2;
  const d = `M -80 0 C -84 -40 -70 -90 -46 -120 C -40 -160 -30 ${-196 + b} 0 ${-200 + b} C 30 ${-196 + b} 42 -160 46 -120 C 70 -90 84 -40 80 0 Z`;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d={d} fill={color} />
      {rim && (
        <path d={rimSide > 0 ? `M 0 ${-200 + b} C 30 ${-196 + b} 42 -160 46 -120 C 70 -90 84 -40 80 0` : `M 0 ${-200 + b} C -30 ${-196 + b} -42 -160 -46 -120 C -70 -90 -84 -40 -80 0`} stroke={rim} strokeWidth={4} fill="none" opacity={0.85} style={{filter: `drop-shadow(0 0 6px ${rim})`}} />
      )}
    </g>
  );
};

/** palm-leaf manuscript (pothi) */
export const Pothi: React.FC<{x: number; y: number; w?: number; s?: number; color?: string; glow?: string; open?: number; rot?: number}> = ({x, y, w = 160, s = 1, color = '#c9a86a', glow, open = 0, rot = 0}) => (
  <g transform={`translate(${x},${y}) scale(${s}) rotate(${rot})`}>
    {glow && <ellipse cx={0} cy={0} rx={w * 0.8} ry={w * 0.3} fill={glow} opacity={0.35} style={{filter: 'blur(14px)'}} />}
    <rect x={-w / 2} y={-8} width={w} height={22} rx={6} fill="#4a2a14" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={-w / 2 + 4} y={-12 - i * 3 - open * i * 10} width={w - 8} height={4} rx={2} fill={color} opacity={0.95} />)}
    <rect x={-w / 2} y={-26 - open * 40} width={w} height={14} rx={5} fill="#5a3418" />
    <line x1={-w * 0.25} y1={-30 - open * 40} x2={-w * 0.25} y2={16} stroke="#2a1608" strokeWidth={2} />
    <line x1={w * 0.25} y1={-30 - open * 40} x2={w * 0.25} y2={16} stroke="#2a1608" strokeWidth={2} />
  </g>
);

/* ---------------- India map ---------------- */
const OUTLINE: [number, number][] = [
  [61, 31], [62.5, 35.5], [66, 37.5], [71, 37], [74.5, 37], [77.5, 35.5], [79, 34], [79, 32.5], [81, 30.3], [84, 28.5], [88, 27.5], [89.5, 28], [92, 27.8], [95, 29], [97, 28], [96.5, 26.5], [95, 25.5], [94, 23.5], [92.5, 22], [91.8, 22.5], [90.5, 22], [89, 21.8], [88, 21.6], [87, 21.4], [86.5, 20.4], [85, 19.5], [84, 18.3], [82.3, 16.6], [81, 15.8], [80.2, 15.2], [80.3, 13], [79.8, 11.5], [79.5, 10.3], [78.2, 8.9], [77.5, 8.1], [76.6, 8.9], [76, 10.5], [75.4, 11.8], [74.6, 13.8], [73.8, 15.8], [73, 18], [72.8, 20], [72.6, 21.3], [72, 21.2], [70.8, 20.8], [69, 22.4], [70, 22.8], [68.5, 23.5], [67.5, 24], [66.6, 25.4], [64, 25.3], [61.6, 25.2], [61, 27.5],
];
const LANKA: [number, number][] = [[79.8, 9.8], [80.3, 9.6], [81.2, 8.5], [81.9, 7.3], [81.6, 6.4], [80.6, 5.9], [79.9, 6.8], [79.8, 8.2]];
const KALINGA: [number, number][] = [[82.0, 22.6], [84.5, 22.9], [87.0, 22.3], [87.0, 21.4], [86.5, 20.4], [85, 19.5], [84, 18.3], [82.6, 17.0], [81.8, 18.6], [81.6, 20.5]];
export const proj = (lon: number, lat: number, k = 30, ox = 0, oy = 0) => [(lon - 60) * k + ox, (38 - lat) * k * 1.08 + oy];
const toPath = (pts: [number, number][], k: number, ox: number, oy: number) => 'M ' + pts.map(([a, b]) => proj(a, b, k, ox, oy).map((v) => v.toFixed(1)).join(' ')).join(' L ') + ' Z';

export const IndiaMap: React.FC<{k?: number; ox?: number; oy?: number; fill: number; kalinga: number; land: string; empire: string; kalingaColor: string; line: string; pillars?: number}> = ({
  k = 30, ox = 0, oy = 0, fill, kalinga, land, empire, kalingaColor, line, pillars = 0,
}) => {
  const outline = toPath(OUTLINE, k, ox, oy);
  const lanka = toPath(LANKA, k, ox, oy);
  const kal = toPath(KALINGA, k, ox, oy);
  const [px, py] = proj(85.1, 25.6, k, ox, oy);
  const southY = proj(80, 13.6, k, ox, oy)[1];
  const neX = proj(89.8, 25, k, ox, oy)[0];
  const r = fill * 50 * k;
  const PILL: [number, number][] = [[85.1, 25.6], [83.0, 25.4], [84.2, 26.9], [83.4, 27.5], [80.0, 28.0], [77.0, 29.3], [79.8, 21.1], [86.0, 21.3], [73.3, 21.5], [76.4, 15.3], [72.5, 33.8], [68.5, 31.3], [78.6, 26.2], [80.9, 28.6]];
  return (
    <g>
      <defs>
        <clipPath id="mapclip"><path d={outline} /></clipPath>
        <filter id="maprough"><feTurbulence baseFrequency="0.04" numOctaves={3} seed={4} /><feDisplacementMap in="SourceGraphic" scale={6} /></filter>
      </defs>
      <g filter="url(#maprough)">
        <path d={outline} fill={land} />
        <path d={lanka} fill={land} />
        <g clipPath="url(#mapclip)">
          <g clipPath="url(#empclip)">
            <circle cx={px} cy={py} r={r} fill={empire} opacity={0.85} />
          </g>
          <defs>
            <clipPath id="empclip"><rect x={-5000} y={-5000} width={5000 + neX} height={5000 + southY} /></clipPath>
          </defs>
          <path d={kal} fill={land} />
          <path d={kal} fill={kalingaColor} opacity={kalinga} />
          <path d={kal} fill="none" stroke={kalingaColor} strokeWidth={3} strokeDasharray="8 6" opacity={Math.min(1, kalinga * 2)} />
        </g>
        <path d={outline} fill="none" stroke={line} strokeWidth={3} />
        <path d={lanka} fill="none" stroke={line} strokeWidth={3} />
      </g>
      {/* capital */}
      <circle cx={px} cy={py} r={9} fill={line} />
      <circle cx={px} cy={py} r={16} fill="none" stroke={line} strokeWidth={2} />
      {PILL.slice(0, Math.floor(pillars * PILL.length)).map(([a, b], i) => {
        const [x, y] = proj(a, b, k, ox, oy);
        return <g key={i}><rect x={x - 3} y={y - 26} width={6} height={26} fill="#f3e4c0" /><circle cx={x} cy={y - 30} r={6} fill="#f3e4c0" /><circle cx={x} cy={y - 14} r={20} fill="#ffd27a" opacity={0.25} /></g>;
      })}
    </g>
  );
};
export const KALINGA_CENTER = proj(84.6, 20.6);
export const PATALIPUTRA = proj(85.1, 25.6);
