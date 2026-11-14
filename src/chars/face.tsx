import React from 'react';
import {lerp, clamp, rnd, useT, mixColor} from '../lib/util';

/* ------------------------------------------------------------------ */
/*  Expression rig                                                     */
/* ------------------------------------------------------------------ */
export type Expr = {
  browIn: number; // raise of inner brow ends (+ up / - down, ~ -14..18)
  browOut: number; // raise of outer ends
  browY: number; // whole brow raise
  lid: number; // upper lid openness 0 (closed) .. 1.3 (wide)
  lidLow: number; // lower-lid squint 0..1
  lookX: number; // gaze -1..1
  lookY: number;
  open: number; // jaw/mouth open 0..1
  smile: number; // -1 (frown) .. 1 (smile)
  wide: number; // mouth width factor
  tear: number; // 0..1 tear running
  sneer: number; // nose wrinkle 0..1
};

export const EX: Record<string, Expr> = {
  neutral: {browIn: 0, browOut: 0, browY: 0, lid: 0.85, lidLow: 0.1, lookX: 0, lookY: 0, open: 0, smile: 0, wide: 1, tear: 0, sneer: 0},
  proud: {browIn: -2, browOut: 2, browY: 1, lid: 0.68, lidLow: 0.25, lookX: 0, lookY: 0.15, open: 0, smile: 0.25, wide: 1, tear: 0, sneer: 0},
  fierce: {browIn: -13, browOut: 4, browY: -3, lid: 0.72, lidLow: 0.45, lookX: 0, lookY: 0, open: 0.0, smile: -0.35, wide: 1.05, tear: 0, sneer: 0.4},
  roar: {browIn: -14, browOut: 5, browY: -2, lid: 0.95, lidLow: 0.3, lookX: 0, lookY: 0, open: 0.85, smile: -0.2, wide: 1.15, tear: 0, sneer: 0.8},
  shock: {browIn: 14, browOut: 10, browY: 8, lid: 1.25, lidLow: 0, lookX: 0, lookY: 0, open: 0.35, smile: -0.2, wide: 0.9, tear: 0, sneer: 0},
  horror: {browIn: 18, browOut: 2, browY: 6, lid: 1.2, lidLow: 0.1, lookX: 0, lookY: 0.1, open: 0.5, smile: -0.7, wide: 1.1, tear: 0, sneer: 0},
  grief: {browIn: 17, browOut: -6, browY: 2, lid: 0.55, lidLow: 0.35, lookX: 0, lookY: 0.4, open: 0.18, smile: -0.85, wide: 1.05, tear: 1, sneer: 0.2},
  wail: {browIn: 18, browOut: -8, browY: 4, lid: 0.35, lidLow: 0.5, lookX: 0, lookY: -0.3, open: 0.75, smile: -0.9, wide: 1.15, tear: 1, sneer: 0.3},
  serene: {browIn: 2, browOut: 0, browY: 1, lid: 0.42, lidLow: 0.2, lookX: 0, lookY: 0.35, open: 0, smile: 0.35, wide: 1, tear: 0, sneer: 0},
  closed: {browIn: 2, browOut: 0, browY: 0, lid: 0.0, lidLow: 0.2, lookX: 0, lookY: 0, open: 0, smile: 0.15, wide: 1, tear: 0, sneer: 0},
  resolve: {browIn: -6, browOut: 1, browY: -1, lid: 0.7, lidLow: 0.3, lookX: 0, lookY: 0, open: 0, smile: -0.15, wide: 0.95, tear: 0, sneer: 0},
  troubled: {browIn: 9, browOut: -3, browY: 0, lid: 0.72, lidLow: 0.2, lookX: 0.4, lookY: 0.2, open: 0.04, smile: -0.4, wide: 0.95, tear: 0, sneer: 0},
  awe: {browIn: 10, browOut: 8, browY: 6, lid: 1.1, lidLow: 0, lookX: 0, lookY: -0.4, open: 0.22, smile: 0, wide: 0.85, tear: 0, sneer: 0},
  sly: {browIn: -5, browOut: 6, browY: 0, lid: 0.55, lidLow: 0.35, lookX: 0.55, lookY: 0, open: 0, smile: 0.45, wide: 1.0, tear: 0, sneer: 0},
  stern: {browIn: -8, browOut: 0, browY: -2, lid: 0.6, lidLow: 0.35, lookX: 0, lookY: 0, open: 0, smile: -0.25, wide: 0.95, tear: 0, sneer: 0},
  calling: {browIn: 16, browOut: -4, browY: 5, lid: 0.8, lidLow: 0.2, lookX: 0.6, lookY: -0.2, open: 0.62, smile: -0.6, wide: 0.95, tear: 1, sneer: 0},
};

export const mixEx = (a: Expr, b: Expr, k: number): Expr => {
  const o: any = {};
  for (const key of Object.keys(a)) o[key] = lerp((a as any)[key], (b as any)[key], clamp(k));
  return o;
};
/** keyframed expression track: [[t, exprName|Expr, transitionSeconds]] */
export const exprTrack = (track: [number, string | Expr, number?][], t: number): Expr => {
  const get = (e: string | Expr) => (typeof e === 'string' ? EX[e] : e);
  let cur = get(track[0][1]);
  for (let i = 1; i < track.length; i++) {
    const [tt, e, d = 0.6] = track[i];
    if (t >= tt) cur = mixEx(cur, get(e), (t - tt) / d);
  }
  return cur;
};

/** natural blinking: returns 0 (open) .. 1 (closed) */
export const blinkAt = (t: number, seed = 1) => {
  const period = 3.2 + rnd(seed) * 2;
  const ph = (t + rnd(seed * 7) * period) % period;
  const idx = Math.floor((t + rnd(seed * 7) * period) / period);
  const off = rnd(idx * 13 + seed) * 0.8;
  const d = ph - off;
  if (d < 0 || d > 0.18) return 0;
  return Math.sin((d / 0.18) * Math.PI);
};

/* ------------------------------------------------------------------ */
/*  Style                                                              */
/* ------------------------------------------------------------------ */
export type Look = {
  skin: string; shade: string; hi: string; lip: string; eye: string; hair: string;
  rim?: string; rimSide?: number; // -1 left / 1 right
  key?: number; // key-light side -1..1
  ambient?: string; ambientK?: number; // environment colour wash multiply
  jaw?: number; cheek?: number; chin?: number; // shape
  kohl?: number; age?: number; // 0..1 wrinkles
  mustache?: 'royal' | 'thin' | 'full' | 'none'; beard?: 'none' | 'short' | 'long' | 'goatee' | 'stubble';
  beardColor?: string;
  head?: 'turban' | 'turban-plain' | 'bald' | 'hood' | 'veil' | 'side-part' | 'hair-bun' | 'none';
  hoodColor?: string; veilColor?: string; turbanColor?: string; jewel?: string;
  mark?: 'tilak' | 'bindi' | 'scar' | 'eye' | 'none'; earrings?: string; noseRing?: boolean;
  outfit?: 'armor' | 'royal' | 'white' | 'saffron' | 'robe' | 'sari' | 'suit' | 'none'; outfitColor?: string; outfitColor2?: string;
};

const headPath = (L: Look, turn: number) => {
  const j = L.jaw ?? 1, c = L.cheek ?? 1, ch = L.chin ?? 1;
  const s = turn * 6;
  return `M ${s} -158 C ${62 + s} -158 ${104 * c} -118 ${106 * c} -50 C ${108 * c} -10 ${104 * c} 30 ${96 * j} 58 C ${86 * j} 100 ${58 * j} ${138 * ch} ${22 * j + s} ${154 * ch} Q ${s * 1.5} ${162 * ch} ${-22 * j + s} ${154 * ch} C ${-58 * j} ${138 * ch} ${-86 * j} 100 ${-96 * j} 58 C ${-104 * c} 30 ${-108 * c} -10 ${-106 * c} -50 C ${-104 * c} -118 ${-62 + s} -158 ${s} -158 Z`;
};

let UID = 0;

/* ------------------------------------------------------------------ */
/*  Face                                                               */
/* ------------------------------------------------------------------ */
export const Face: React.FC<{
  L: Look; e: Expr; x?: number; y?: number; s?: number; turn?: number; tilt?: number; seed?: number; blink?: boolean; id: string; body?: boolean; breathe?: boolean;
}> = ({L, e, x = 0, y = 0, s = 1, turn = 0, tilt = 0, seed = 1, blink = true, id, body = true, breathe = true}) => {
  const t = useT();
  const b = blink ? blinkAt(t, seed) : 0;
  const lid = e.lid * (1 - b);
  const br = breathe ? Math.sin(t * 1.6 + seed) * 2.2 : 0;
  const clip = `hc_${id}`;
  const shadeF = `sf_${id}`;
  const tx = turn * 16; // feature shift for 3/4 turn
  const key = L.key ?? -0.6;
  const age = L.age ?? 0;
  const hair = L.hair;

  /* ---- eyes ---- */
  const eye = (side: -1 | 1) => {
    const far = side * turn > 0 ? 1 - Math.abs(turn) * 0.35 : 1 + Math.abs(turn) * 0.08;
    const cx = side * 44 * (1 - Math.abs(turn) * 0.12) + tx;
    const cy = -18;
    const wIn = 19 * far, wOut = 30 * far;
    const inner = [cx - side * wIn, cy + 2];
    const outer = [cx + side * wOut, cy - 3];
    const top = 22 * lid;
    const bot = 10 * (1 - e.lidLow * 0.6);
    const ctT = [cx - side * 2, cy - top - 2];
    const ctB = [cx + side * 2, cy + bot + 1];
    const shape = `M ${inner[0]} ${inner[1]} Q ${ctT[0]} ${ctT[1]} ${outer[0]} ${outer[1]} Q ${ctB[0]} ${ctB[1]} ${inner[0]} ${inner[1]} Z`;
    const ix = cx + e.lookX * 9 * far + turn * 4;
    const iy = cy + e.lookY * 4 - 1;
    const ec = `ec_${id}_${side}`;
    const kohl = L.kohl ?? 0.5;
    return (
      <g key={side}>
        {/* socket shadow */}
        <ellipse cx={cx} cy={cy - 8} rx={36 * far} ry={22} fill={L.shade} opacity={0.45} filter={`url(#${shadeF})`} />
        <defs><clipPath id={ec}><path d={shape} /></clipPath></defs>
        {lid > 0.06 && (
          <g clipPath={`url(#${ec})`}>
            <path d={shape} fill="#efe6da" />
            <circle cx={ix} cy={iy} r={14.5 * Math.min(1, far + 0.1)} fill={L.eye} />
            <circle cx={ix} cy={iy} r={14.5 * Math.min(1, far + 0.1)} fill="none" stroke="#120806" strokeWidth={2} opacity={0.7} />
            <circle cx={ix} cy={iy} r={6.4} fill="#070302" />
            <circle cx={ix - 4} cy={iy - 5} r={3.2} fill="#fff" opacity={0.95} />
            <circle cx={ix + 4} cy={iy + 4} r={1.4} fill="#fff" opacity={0.5} />
            {/* lid shadow on eyeball */}
            <path d={`M ${inner[0]} ${inner[1]} Q ${ctT[0]} ${ctT[1]} ${outer[0]} ${outer[1]} L ${outer[0]} ${outer[1] - 30} L ${inner[0]} ${inner[1] - 30} Z`} fill="#000" opacity={0.25} transform="translate(0,5)" />
          </g>
        )}
        {/* upper lash line + kohl wing */}
        <path d={`M ${inner[0]} ${inner[1]} Q ${ctT[0]} ${ctT[1]} ${outer[0]} ${outer[1]}`} fill="none" stroke="#140a06" strokeWidth={3.5 + kohl * 2.5} strokeLinecap="round" />
        {kohl > 0.4 && <path d={`M ${outer[0] - side * 6} ${outer[1] - 1} L ${outer[0] + side * (8 + kohl * 8)} ${outer[1] - 4 - kohl * 3}`} stroke="#140a06" strokeWidth={2.5} strokeLinecap="round" />}
        {/* lower lid line */}
        <path d={`M ${inner[0] + side * 3} ${inner[1] + 1} Q ${ctB[0]} ${ctB[1]} ${outer[0] - side * 2} ${outer[1] + 1}`} fill="none" stroke={L.shade} strokeWidth={2} opacity={0.8} />
        {/* lid crease */}
        <path d={`M ${inner[0] + side * 2} ${inner[1] - 6} Q ${cx} ${cy - 17 - Math.max(top, 10) * 0.55 - 4} ${outer[0] + side * 2} ${outer[1] - 6}`} fill="none" stroke={L.shade} strokeWidth={2.5} opacity={0.75} />
        {/* bags / age */}
        {age > 0.2 && <path d={`M ${inner[0] + side * 2} ${cy + 14} Q ${cx} ${cy + 24} ${outer[0] - side * 4} ${cy + 10}`} fill="none" stroke={L.shade} strokeWidth={2} opacity={age * 0.8} />}
      </g>
    );
  };

  /* ---- brows ---- */
  const brow = (side: -1 | 1) => {
    const far = side * turn > 0 ? 1 - Math.abs(turn) * 0.3 : 1;
    const bx = (v: number) => side * v * far * (1 - Math.abs(turn) * 0.1) + tx;
    const yi = -56 - e.browY * 1.2 - e.browIn * 1.3;
    const yo = -54 - e.browY * 1.2 - e.browOut * 1.2;
    const ym = (yi + yo) / 2 - 7 - e.browOut * 0.2;
    const d = `M ${bx(18)} ${yi + 5} Q ${bx(22)} ${yi - 6} ${bx(42)} ${ym - 2} Q ${bx(62)} ${ym - 3} ${bx(80)} ${yo + 3} Q ${bx(60)} ${ym + 6} ${bx(42)} ${ym + 7} Q ${bx(26)} ${yi + 8} ${bx(18)} ${yi + 5} Z`;
    return <path key={side} d={d} fill={hair} />;
  };

  /* ---- mouth ---- */
  const w = 37 * e.wide;
  const my = 90;
  const cy = my - e.smile * 11;
  const cxL = -w - e.smile * 3 + tx, cxR = w + e.smile * 3 + tx;
  const op = e.open;
  const upP = my + 2 + e.smile * 5 - op * 3; // upper parting control
  const loP = my + 2 + e.smile * 5 + op * 62; // lower parting control
  const upperLip = `M ${cxL} ${cy} Q ${-14 + tx} ${my - 10} ${-6 + tx} ${my - 9} Q ${tx} ${my - 6} ${6 + tx} ${my - 9} Q ${14 + tx} ${my - 10} ${cxR} ${cy} Q ${tx} ${upP} ${cxL} ${cy} Z`;
  const lowerLip = `M ${cxL} ${cy} Q ${tx} ${loP} ${cxR} ${cy} Q ${tx} ${loP + 26 - op * 8} ${cxL} ${cy} Z`;
  const inside = `M ${cxL} ${cy} Q ${tx} ${upP} ${cxR} ${cy} Q ${tx} ${loP} ${cxL} ${cy} Z`;
  const mclip = `mc_${id}`;

  /* ---- tears ---- */
  const tear = (side: -1 | 1) => {
    if (e.tear < 0.02) return null;
    const ph = (t * 0.25 + (side > 0 ? 0.5 : 0)) % 1;
    const len = 18 + 46 * clamp(e.tear);
    const sx = side * 38 + tx, sy = -2;
    const dy = sy + len * Math.min(1, ph * 1.5);
    return (
      <g key={'t' + side} opacity={clamp(e.tear * 1.3)}>
        <path d={`M ${sx} ${sy} Q ${sx + side * 2} ${(sy + dy) / 2} ${sx + side * 10} ${dy}`} stroke="#cfe3ff" strokeWidth={2.5} fill="none" opacity={0.35} strokeLinecap="round" />
        <ellipse cx={sx + side * 10} cy={dy + 3} rx={4} ry={6} fill="#dcecff" opacity={0.85} />
        <circle cx={sx + side * 9} cy={dy + 1} r={1.5} fill="#fff" />
        <path d={`M ${sx - 8 * side} ${sy - 1} Q ${sx} ${sy + 4} ${sx + 10 * side} ${sy}`} stroke="#e8f2ff" strokeWidth={2} opacity={0.6} fill="none" />
      </g>
    );
  };

  const ambient = L.ambient;
  const rimSide = L.rimSide ?? 1;
  const hp = headPath(L, turn);
  const uid = id;

  return (
    <g transform={`translate(${x}, ${y + br * 0.4}) scale(${s}) rotate(${tilt})`}>
      <defs>
        <clipPath id={clip}><path d={hp} /></clipPath>
        <filter id={shadeF} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={9} /></filter>
        <linearGradient id={`kl_${uid}`} x1={key < 0 ? 0 : 1} x2={key < 0 ? 1 : 0} y1={0} y2={0}>
          <stop offset="0" stopColor={L.hi} stopOpacity={0.55} />
          <stop offset="0.38" stopColor={L.hi} stopOpacity={0} />
          <stop offset="0.75" stopColor={L.shade} stopOpacity={0.2} />
          <stop offset="1" stopColor={L.shade} stopOpacity={0.85} />
        </linearGradient>
      </defs>


      {/* hood / veil back */}
      {L.head === 'hood' && <path d="M -175 360 C -200 120 -175 -170 0 -215 C 175 -170 200 120 175 360 Z" fill={mixColor(L.hoodColor ?? '#222', '#000', 0.35)} />}
      {L.head === 'veil' && <path d="M -190 380 C -200 120 -170 -175 0 -205 C 170 -175 200 120 190 380 Z" fill={mixColor(L.veilColor ?? '#634', '#000', 0.3)} />}
      {L.head === 'hair-bun' && <ellipse cx={0} cy={-150} rx={130} ry={90} fill={hair} />}

      {/* neck */}
      <path d={`M ${-58 + tx * 0.3} 100 L -64 ${body ? 250 : 190} L 64 ${body ? 250 : 190} L ${58 + tx * 0.3} 100 Z`} fill={L.skin} />
      <path d={`M -64 ${body ? 250 : 190} L ${-58 + tx * 0.3} 100 L ${58 + tx * 0.3} 100 L 64 ${body ? 250 : 190} Z`} fill={L.shade} opacity={body ? 0.55 : 0.3} />
      <ellipse cx={tx * 0.5} cy={150} rx={70} ry={34} fill="#000" opacity={0.35} filter={`url(#${shadeF})`} />

      {/* ---------------- body ---------------- */}
      {body && <Body L={L} br={br} turn={turn} id={uid} />}

      {/* ears */}
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <path d={`M ${sd * 100 + tx * 0.2} -30 C ${sd * 128} -40 ${sd * 130} 20 ${sd * 98 + tx * 0.2} 34 Z`} fill={sd * key > 0 ? L.skin : L.shade} />
          {L.earrings && (
            <g>
              <circle cx={sd * 112 + tx * 0.2} cy={48} r={13} fill="none" stroke={L.earrings} strokeWidth={5} />
              <circle cx={sd * 112 + tx * 0.2} cy={62} r={5} fill={L.earrings} />
            </g>
          )}
        </g>
      ))}

      {/* ---------------- head ---------------- */}
      <path d={hp} fill={L.rim ?? L.skin} />
      <g clipPath={`url(#${clip})`}>
        <path d={hp} fill={L.skin} transform={L.rim ? `translate(${-rimSide * 7}, 2)` : undefined} />
        {/* form shading */}
        <g filter={`url(#${shadeF})`}>
          <ellipse cx={-key * 120 + tx} cy={20} rx={70} ry={190} fill={L.shade} opacity={0.55} />
          <ellipse cx={tx} cy={-150} rx={140} ry={40} fill={L.shade} opacity={0.25} />
          <ellipse cx={-58 + tx} cy={58} rx={26} ry={34} fill={L.shade} opacity={0.35} />
          <ellipse cx={58 + tx} cy={58} rx={26} ry={34} fill={L.shade} opacity={0.35} />
          <ellipse cx={tx} cy={65} rx={20} ry={8} fill={L.shade} opacity={0.7} />
          <ellipse cx={tx} cy={122} rx={28} ry={9} fill={L.shade} opacity={0.6} />
          <ellipse cx={key * 50 + tx} cy={-90} rx={45} ry={30} fill={L.hi} opacity={0.5} />
          <ellipse cx={key * 64 + tx} cy={30} rx={18} ry={26} fill={L.hi} opacity={0.4} />
          <ellipse cx={tx + key * 8} cy={30} rx={9} ry={34} fill={L.hi} opacity={0.45} />
        </g>
        <rect x={-130} y={-180} width={260} height={360} fill={`url(#kl_${uid})`} />
        {/* stubble */}
        {L.beard === 'stubble' && <path d={`M -92 80 C -84 112 -58 140 -22 154 Q 0 162 22 154 C 58 140 84 112 92 80 C 70 96 44 104 0 108 C -44 104 -70 96 -92 80 Z`} fill={L.beardColor ?? hair} opacity={0.22} filter={`url(#${shadeF})`} />}
      </g>

      {/* ---------------- features ---------------- */}
      {eye(-1)}
      {eye(1)}
      {brow(-1)}
      {brow(1)}

      {/* forehead / frown lines */}
      {(e.browIn + e.browY > 6 || age > 0.3) &&
        [0, 1, 2].map((i) => (
          <path key={i} d={`M ${-45 + tx} ${-92 - i * 13} Q ${tx} ${-98 - i * 13 - e.browIn * 0.3} ${45 + tx} ${-92 - i * 13}`} stroke={L.shade} strokeWidth={2.2} fill="none"
            opacity={clamp((e.browIn + e.browY - 6) / 14) * 0.8 + age * 0.4} />
        ))}
      {e.browIn < -4 && [-1, 1].map((sd) => <path key={sd} d={`M ${sd * 9 + tx} -58 L ${sd * 6 + tx} -38`} stroke={L.shade} strokeWidth={2.5} opacity={clamp(-e.browIn / 12)} />)}

      {/* nose */}
      <path d={`M ${-10 + tx * 1.2} -36 C ${-14 + tx * 1.2} 0 ${-20 + tx * 1.2} 24 ${-24 + tx * 1.25} 48`} stroke={L.shade} strokeWidth={4} fill="none" opacity={0.5} filter={`url(#${shadeF})`} />
      <path d={`M ${-22 + tx * 1.25} 44 Q ${-30 + tx * 1.25} 56 ${-16 + tx * 1.25} 60 M ${22 + tx * 1.25} 44 Q ${30 + tx * 1.25} 56 ${16 + tx * 1.25} 60`} stroke={L.shade} strokeWidth={3} fill="none" opacity={0.9} />
      <ellipse cx={-10 + tx * 1.25} cy={58} rx={6} ry={3} fill="#1c0c06" opacity={0.75} />
      <ellipse cx={10 + tx * 1.25} cy={58} rx={6} ry={3} fill="#1c0c06" opacity={0.75} />
      <ellipse cx={tx * 1.3 + key * 4} cy={46} rx={9} ry={7} fill={L.hi} opacity={0.5} />
      {e.sneer > 0.1 && <path d={`M ${-14 + tx} 8 Q ${tx} 2 ${14 + tx} 8`} stroke={L.shade} strokeWidth={2} fill="none" opacity={e.sneer} />}
      {/* nasolabial folds */}
      {[-1, 1].map((sd) => (
        <path key={sd} d={`M ${sd * 26 + tx} 52 Q ${sd * (w + 4) + tx} 70 ${sd * (w + 8) + tx} ${cy + 6}`} stroke={L.shade} strokeWidth={2.5} fill="none" opacity={0.25 + Math.max(0, e.smile) * 0.4 + e.sneer * 0.3 + age * 0.4} />
      ))}

      {/* mouth */}
      <defs><clipPath id={mclip}><path d={inside} /></clipPath></defs>
      {op > 0.03 && (
        <g>
          <path d={inside} fill="#2a0c08" />
          <g clipPath={`url(#${mclip})`}>
            <rect x={-w + tx} y={my - 12} width={w * 2} height={10 + op * 3} fill="#e9dfcf" rx={3} />
            <ellipse cx={tx} cy={loP} rx={w * 0.6} ry={12} fill="#7a2b28" opacity={0.8} />
          </g>
        </g>
      )}
      <path d={upperLip} fill={L.lip} />
      <path d={lowerLip} fill={mixColor(L.lip, L.hi, 0.15)} />
      <path d={`M ${cxL} ${cy} Q ${tx} ${upP} ${cxR} ${cy}`} stroke="#2a0c08" strokeWidth={op > 0.03 ? 2 : 3} fill="none" strokeLinecap="round" />
      <ellipse cx={tx} cy={(loP + cy) / 2 + 8 + op * 6} rx={13} ry={3} fill="#fff" opacity={0.15} />

      {/* facial hair */}
      {L.mustache === 'royal' && (
        <path
          d={`M ${tx} 66 C ${-18 + tx} 64 ${-40 + tx} 70 ${cxL - 6} ${cy - 2} C ${cxL - 18} ${cy - 6} ${cxL - 24} ${cy - 18} ${cxL - 14} ${cy - 26} C ${cxL - 18} ${cy - 12} ${cxL - 6} ${cy - 8} ${cxL + 4} ${cy - 12} C ${-26 + tx} ${my - 6} ${-10 + tx} ${my - 12} ${tx} ${my - 10} C ${10 + tx} ${my - 12} ${26 + tx} ${my - 6} ${cxR - 4} ${cy - 12} C ${cxR + 6} ${cy - 8} ${cxR + 18} ${cy - 12} ${cxR + 14} ${cy - 26} C ${cxR + 24} ${cy - 18} ${cxR + 18} ${cy - 6} ${cxR + 6} ${cy - 2} C ${40 + tx} 70 ${18 + tx} 64 ${tx} 66 Z`}
          fill={L.beardColor ?? hair}
        />
      )}
      {L.mustache === 'full' && (
        <path d={`M ${tx} 64 C ${-30 + tx} 62 ${cxL - 4} ${cy - 10} ${cxL - 6} ${cy + 14} C ${cxL + 6} ${cy + 2} ${-20 + tx} ${my - 6} ${tx} ${my - 8} C ${20 + tx} ${my - 6} ${cxR - 6} ${cy + 2} ${cxR + 6} ${cy + 14} C ${cxR + 4} ${cy - 10} ${30 + tx} 62 ${tx} 64 Z`} fill={L.beardColor ?? hair} />
      )}
      {L.mustache === 'thin' && <path d={`M ${cxL + 2} ${cy - 6} Q ${tx} ${my - 18} ${cxR - 2} ${cy - 6}`} stroke={L.beardColor ?? hair} strokeWidth={5} fill="none" strokeLinecap="round" />}
      {L.beard === 'short' && (
        <path d={`M -98 40 C -94 100 -60 150 -22 166 Q 0 176 22 166 C 60 150 94 100 98 40 C 88 80 66 104 ${cxR + 10} ${cy + 10} Q ${tx} ${loP + 34} ${cxL - 10} ${cy + 10} C -66 104 -88 80 -98 40 Z`} fill={L.beardColor ?? hair} />
      )}
      {L.beard === 'goatee' && <path d={`M ${cxL + 6} ${cy + 14} Q ${tx} ${loP + 30} ${cxR - 6} ${cy + 14} Q ${tx + 22} 170 ${tx} 190 Q ${tx - 22} 170 ${cxL + 6} ${cy + 14} Z`} fill={L.beardColor ?? hair} />}
      {L.beard === 'long' && (
        <path d={`M -100 30 C -100 120 -80 220 -30 300 Q 0 330 30 300 C 80 220 100 120 100 30 C 90 76 70 100 ${cxR + 8} ${cy + 8} Q ${tx} ${loP + 30} ${cxL - 8} ${cy + 8} C -70 100 -90 76 -100 30 Z`} fill={L.beardColor ?? hair} />
      )}
      {L.beard === 'long' && [-30, 0, 30].map((dx) => <path key={dx} d={`M ${dx} 150 Q ${dx * 1.2 + 6} 230 ${dx * 0.6} 300`} stroke="#000" opacity={0.12} strokeWidth={3} fill="none" />)}

      {tear(-1)}
      {tear(1)}

      {/* marks */}
      {L.mark === 'tilak' && <path d={`M ${tx - 5} -110 L ${tx + 5} -110 L ${tx + 3} -62 L ${tx - 3} -62 Z`} fill="#c8321e" />}
      {L.mark === 'bindi' && <circle cx={tx} cy={-62} r={7} fill="#b0161a" />}
      {L.mark === 'eye' && <g><ellipse cx={tx} cy={-92} rx={13} ry={6} fill="none" stroke="#e8c45a" strokeWidth={2.5} /><circle cx={tx} cy={-92} r={3} fill="#e8c45a" /></g>}
      {L.mark === 'scar' && <path d={`M ${50 + tx} -80 L ${30 + tx} 30`} stroke={mixColor(L.skin, '#fff', 0.25)} strokeWidth={4} opacity={0.8} />}
      {L.noseRing && <circle cx={-24 + tx * 1.25} cy={56} r={9} fill="none" stroke="#e7d9a8" strokeWidth={2.5} />}

      {/* ---------------- headwear ---------------- */}
      <Headwear L={L} turn={turn} id={uid} />

      {/* environment wash so the character sits in the scene's light */}
      {ambient && (
        <g style={{mixBlendMode: 'multiply'}} opacity={L.ambientK ?? 0.35}>
          <path d={hp} fill={ambient} />
          {body && <path d="M -330 600 C -300 330 -180 250 -50 240 L 50 240 C 180 250 300 330 330 600 Z" fill={ambient} />}
        </g>
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ */
const Headwear: React.FC<{L: Look; turn: number; id: string}> = ({L, turn}) => {
  const tx = turn * 10;
  if (L.head === 'turban' || L.head === 'turban-plain') {
    const c = L.turbanColor ?? '#e8dcc0';
    const d = mixColor(c, '#000', 0.35);
    const royal = L.head === 'turban';
    return (
      <g>
        <path d={`M -118 -40 C -150 -150 -90 -250 ${tx} -262 C 90 -250 150 -150 118 -40 C 80 -70 40 -78 ${tx} -80 C -40 -78 -80 -70 -118 -40 Z`} fill={c} />
        {/* folds */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M ${-120 + i * 8} ${-60 - i * 40} Q ${tx} ${-120 - i * 38} ${116 - i * 10} ${-68 - i * 42}`} stroke={d} strokeWidth={6} fill="none" opacity={0.6} />
        ))}
        <path d={`M -118 -40 C -80 -70 -40 -78 ${tx} -80 C 40 -78 80 -70 118 -40`} stroke={d} strokeWidth={10} fill="none" opacity={0.7} />
        {royal && (
          <g>
            {/* Mauryan crest knot */}
            <path d={`M ${tx - 40} -230 C ${tx - 70} -300 ${tx + 70} -300 ${tx + 40} -230 Z`} fill={c} stroke={d} strokeWidth={4} />
            <path d={`M ${tx - 120} -60 Q ${tx} -110 ${tx + 120} -60`} stroke="#d9a63a" strokeWidth={9} fill="none" />
            <circle cx={tx} cy={-118} r={22} fill="#d9a63a" />
            <circle cx={tx} cy={-118} r={13} fill={L.jewel ?? '#b3122e'} />
            <circle cx={tx - 4} cy={-122} r={4} fill="#fff" opacity={0.8} />
            {[-1, 1].map((sd) => <circle key={sd} cx={tx + sd * 40} cy={-104} r={7} fill="#d9a63a" />)}
            <path d={`M ${tx} -140 C ${tx - 6} -190 ${tx + 30} -230 ${tx + 10} -270`} stroke="#d9a63a" strokeWidth={5} fill="none" />
          </g>
        )}
      </g>
    );
  }
  if (L.head === 'bald') {
    return <ellipse cx={turn * 10 - 30} cy={-125} rx={40} ry={16} fill="#fff" opacity={0.18} />;
  }
  if (L.head === 'hood') {
    const c = L.hoodColor ?? '#222';
    return (
      <g>
        <path fillRule="evenodd" d={`M -190 360 C -215 120 -190 -190 ${tx} -232 C 190 -190 215 120 190 360 L 120 360 C 140 200 130 40 118 -40 C 100 -150 60 -176 ${tx} -178 C -60 -176 -100 -150 -118 -40 C -130 40 -140 200 -120 360 Z`} fill={c} />
        <path d={`M -118 -40 C -100 -150 -60 -176 ${tx} -178 C 60 -176 100 -150 118 -40`} stroke="#000" strokeWidth={14} opacity={0.35} fill="none" />
        {/* hood casts shadow on upper face */}
        <path d={`M -120 -40 C -100 -150 -60 -176 ${tx} -178 C 60 -176 100 -150 120 -40 C 80 -80 40 -95 ${tx} -96 C -40 -95 -80 -80 -120 -40 Z`} fill="#000" opacity={0.5} style={{filter: 'blur(10px)'}} />
      </g>
    );
  }
  if (L.head === 'veil') {
    const c = L.veilColor ?? '#634';
    return (
      <g>
        <path fillRule="evenodd" d={`M -200 380 C -210 120 -180 -190 ${tx} -214 C 180 -190 210 120 200 380 L 130 380 C 150 200 130 40 116 -50 C 96 -150 60 -170 ${tx} -172 C -60 -170 -96 -150 -116 -50 C -130 40 -150 200 -130 380 Z`} fill={c} />
        <path d={`M -116 -50 C -96 -150 -60 -170 ${tx} -172 C 60 -170 96 -150 116 -50`} stroke="#d8b25a" strokeWidth={6} fill="none" opacity={0.8} />
        {[0, 1, 2].map((i) => <path key={i} d={`M ${-170 + i * 12} ${300 - i * 20} Q ${-150 + i * 10} 0 ${-90 + i * 20} ${-170 + i * 10}`} stroke="#000" opacity={0.12} strokeWidth={5} fill="none" />)}
      </g>
    );
  }
  if (L.head === 'side-part') {
    return <path d={`M -112 -40 C -120 -140 -60 -190 ${tx + 10} -186 C 90 -184 124 -130 112 -40 C 100 -100 70 -120 30 -130 C 0 -110 -60 -110 -112 -40 Z`} fill={L.hair} />;
  }
  if (L.head === 'hair-bun') {
    return <path d={`M -112 -40 C -120 -140 -60 -186 ${tx} -186 C 60 -186 120 -140 112 -40 C 96 -110 50 -130 ${tx} -132 C -50 -130 -96 -110 -112 -40 Z`} fill={L.hair} />;
  }
  return null;
};

/* ------------------------------------------------------------------ */
const Body: React.FC<{L: Look; br: number; turn: number; id: string}> = ({L, br, turn}) => {
  const o = L.outfit ?? 'none';
  const c1 = L.outfitColor ?? '#555';
  const c2 = L.outfitColor2 ?? mixColor(c1, '#000', 0.35);
  const sh = `M -330 600 C -320 360 -220 270 -60 248 L 60 248 C 220 270 320 360 330 600 Z`;
  const by = -br;
  return (
    <g transform={`translate(${turn * 10}, ${by - 28})`}>
      <path d={sh} fill={c1} />
      {o === 'armor' && (
        <g>
          <path d="M -230 600 C -230 420 -180 330 -60 300 L 60 300 C 180 330 230 420 230 600 Z" fill={c2} />
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M -200 ${360 + i * 55} Q 0 ${330 + i * 55} 200 ${360 + i * 55}`} stroke="#d9a63a" strokeWidth={4} fill="none" opacity={0.7} />)}
          <circle cx={-250} cy={330} r={60} fill="#7a5a2a" />
          <circle cx={250} cy={330} r={60} fill="#7a5a2a" />
          <circle cx={-250} cy={330} r={34} fill="#d9a63a" opacity={0.6} />
          <circle cx={250} cy={330} r={34} fill="#d9a63a" opacity={0.6} />
          <path d="M -60 248 Q 0 290 60 248" stroke="#d9a63a" strokeWidth={10} fill="none" />
          <path d="M -260 300 L 200 600" stroke="#9e1b1b" strokeWidth={40} />
        </g>
      )}
      {o === 'royal' && (
        <g>
          <path d="M -60 248 Q 0 330 60 248" stroke="#d9a63a" strokeWidth={14} fill="none" />
          <path d="M -90 260 Q 0 380 90 260" stroke="#d9a63a" strokeWidth={8} fill="none" />
          {[-60, -30, 0, 30, 60].map((dx, i) => <circle key={i} cx={dx} cy={300 + Math.abs(dx) * -0.6 + 40} r={7} fill={i === 2 ? '#b3122e' : '#e6c46a'} />)}
          <path d="M -300 600 C -260 400 -200 300 -120 270 L -160 600 Z" fill={c2} />
        </g>
      )}
      {(o === 'white' || o === 'saffron' || o === 'robe') && (
        <g>
          <path d="M -60 248 C 20 300 120 380 200 600 L 300 600 C 260 420 180 300 60 250 Z" fill={c2} opacity={0.85} />
          {[0, 1, 2].map((i) => <path key={i} d={`M ${-40 + i * 40} 280 Q ${40 + i * 60} 420 ${120 + i * 50} 600`} stroke="#000" opacity={0.12} strokeWidth={5} fill="none" />)}
        </g>
      )}
      {o === 'suit' && (
        <g>
          <path d="M -60 248 L 0 400 L 60 248 Z" fill="#e8e2d4" />
          <path d="M -60 248 L -110 420 L 0 400 Z M 60 248 L 110 420 L 0 400 Z" fill={c2} />
          <path d="M -8 270 L 8 270 L 12 400 L 0 420 L -12 400 Z" fill="#6b1e1e" />
        </g>
      )}
    </g>
  );
};
