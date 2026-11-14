import React from 'react';
import {Face, Expr, EX, Look} from './face';
import {clamp, lerp, mixColor, useT, noise1} from '../lib/util';

/* ------------------------------------------------------------------ */
/*  Pose: joint angles in degrees (0 = limb hangs straight down,        */
/*  + rotates the limb towards screen-right)                           */
/* ------------------------------------------------------------------ */
export type Pose = {
  lean: number; hipY: number; hipX: number;
  lHip: number; lKnee: number; rHip: number; rKnee: number;
  lSh: number; lEl: number; lWr: number; rSh: number; rEl: number; rWr: number;
  lHand: number; rHand: number; // 0 open, 1 fist, 2 point
  headTilt: number;
};
const Z: Pose = {lean: 0, hipY: 0, hipX: 0, lHip: 4, lKnee: 0, rHip: -4, rKnee: 0, lSh: 8, lEl: -6, lWr: 0, rSh: -8, rEl: 6, rWr: 0, lHand: 0, rHand: 0, headTilt: 0};
export const P: Record<string, Pose> = {
  stand: Z,
  proud: {...Z, lean: -2, lSh: 20, lEl: -70, rSh: -20, rEl: 70, lHand: 1, rHand: 1}, // hands on hips
  point: {...Z, lean: 3, rSh: -105, rEl: -8, rWr: 0, rHand: 2},
  raise: {...Z, lean: -2, rSh: -150, rEl: -10, rWr: -10, rHand: 0}, // abhaya-like raised palm
  command: {...Z, lean: 4, rSh: -80, rEl: -40, rWr: -20, rHand: 0, lSh: 10, lEl: -20},
  clasp: {...Z, lSh: 24, lEl: -95, rSh: -24, rEl: 95, lHand: 1, rHand: 1},
  listen: {...Z, lean: 5, headTilt: 8, rSh: -30, rEl: -120, rHand: 1, lSh: 18, lEl: -60},
  write: {...Z, lean: 10, rSh: -40, rEl: -70, rWr: 20, rHand: 2, lSh: 30, lEl: -60},
  hold: {...Z, lSh: 30, lEl: -90, rSh: -30, rEl: 90, lHand: 1, rHand: 1}, // holding something in front
  cower: {...Z, lean: 8, hipY: 10, lKnee: 18, rKnee: 18, lSh: 40, lEl: -140, rSh: -40, rEl: 140, headTilt: 10},
  cheer: {...Z, lSh: 160, lEl: 10, rSh: -160, rEl: -10, lHand: 1, rHand: 1},
};
export const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const o: any = {};
  for (const key of Object.keys(a)) o[key] = lerp((a as any)[key], (b as any)[key], clamp(k));
  return o;
};
export const poseTrack = (track: [number, string | Pose, number?][], t: number): Pose => {
  const get = (p: string | Pose) => (typeof p === 'string' ? P[p] : p);
  let cur = get(track[0][1]);
  for (let i = 1; i < track.length; i++) {
    const [tt, p, d = 0.6] = track[i];
    if (t >= tt) {
      const k = clamp((t - tt) / d);
      cur = mixPose(cur, get(p), k * k * (3 - 2 * k));
    }
  }
  return cur;
};
/** walk cycle layered on a pose. phase in radians. */
export const walk = (p: Pose, phase: number, amt = 1): Pose => ({
  ...p,
  lHip: p.lHip + Math.sin(phase) * 13 * amt, rHip: p.rHip - Math.sin(phase) * 13 * amt,
  lKnee: p.lKnee + Math.max(0, -Math.cos(phase)) * 16 * amt, rKnee: p.rKnee + Math.max(0, Math.cos(phase)) * 16 * amt,
  lSh: p.lSh - Math.sin(phase) * 16 * amt, rSh: p.rSh + Math.sin(phase) * 16 * amt,
  hipY: p.hipY + Math.abs(Math.cos(phase)) * 6 * amt,
});
/** talking gesture overlay driven by speech energy 0..1 */
export const talk = (p: Pose, t: number, e: number, seed = 1): Pose => ({
  ...p,
  rSh: p.rSh - e * (20 + 25 * noise1(t * 1.3, seed)),
  rEl: p.rEl - e * (30 + 30 * noise1(t * 1.7, seed + 3)),
  rWr: p.rWr + e * 20 * (noise1(t * 2.3, seed + 5) - 0.5),
  headTilt: p.headTilt + e * 5 * (noise1(t * 1.1, seed + 7) - 0.5),
});

/* ------------------------------------------------------------------ */
const rad = (d: number) => (d * Math.PI) / 180;

/** tapered limb between two points, with a soft core shadow on the side away from the key light */
const Limb: React.FC<{a: [number, number]; b: [number, number]; wa: number; wb: number; fill: string; shade: string; rim?: string; key2?: number}> = ({a, b, wa, wb, fill, shade, rim, key2 = -1}) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const P = (pt: number[], w: number, f: number) => [pt[0] + nx * w * f, pt[1] + ny * w * f];
  const p1 = P(a, wa, 1), p2 = P(b, wb, 1), p3 = P(b, wb, -1), p4 = P(a, wa, -1);
  const d = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} L ${p4[0]} ${p4[1]} Z`;
  const side = key2 < 0 ? 1 : -1;
  const s1 = P(a, wa, side * 0.15), s2 = P(b, wb, side * 0.15), s3 = P(b, wb, side * 0.98), s4 = P(a, wa, side * 0.98);
  const r1 = P(a, wa, -side * 0.82), r2 = P(b, wb, -side * 0.82);
  return (
    <g>
      <path d={d} fill={fill} />
      <circle cx={a[0]} cy={a[1]} r={wa} fill={fill} />
      <circle cx={b[0]} cy={b[1]} r={wb} fill={fill} />
      <path d={`M ${s1[0]} ${s1[1]} L ${s2[0]} ${s2[1]} L ${s3[0]} ${s3[1]} L ${s4[0]} ${s4[1]} Z`} fill={shade} opacity={0.38} />
      {rim && <line x1={r1[0]} y1={r1[1]} x2={r2[0]} y2={r2[1]} stroke={rim} strokeWidth={2} strokeLinecap="round" opacity={0.7} />}
    </g>
  );
};

const Hand: React.FC<{x: number; y: number; ang: number; kind: number; fill: string; shade: string; s?: number}> = ({x, y, ang, kind, fill, shade, s = 0.8}) => (
  <g transform={`translate(${x},${y}) rotate(${-ang}) scale(${s})`}>
    {kind === 1 ? (
      <g><ellipse cx={0} cy={12} rx={15} ry={16} fill={fill} /><path d="M -10 6 Q 0 2 12 8" stroke={shade} strokeWidth={2} fill="none" /></g>
    ) : kind === 2 ? (
      <g><ellipse cx={0} cy={10} rx={14} ry={14} fill={fill} /><rect x={-4} y={14} width={8} height={30} rx={4} fill={fill} /><path d="M 12 4 q 8 6 4 16" stroke={fill} strokeWidth={8} strokeLinecap="round" fill="none" /></g>
    ) : (
      <g>
        <path d="M -14 0 L 14 0 L 15 26 Q 15 34 8 36 L 6 46 M -14 0 L -15 26" fill={fill} />
        <path d="M -14 0 C -16 20 -15 40 -9 46 L -4 48 L -2 30 L 2 50 L 6 30 L 9 48 L 12 44 L 15 26 C 16 14 15 6 14 0 Z" fill={fill} />
        <path d="M 14 8 C 22 14 24 22 20 28" stroke={fill} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d="M -4 30 L -4 44 M 2 30 L 2 46" stroke={shade} strokeWidth={1.5} opacity={0.6} />
      </g>
    )}
  </g>
);

export type Outfit = {
  kind: 'dhoti' | 'robe' | 'royal' | 'monk' | 'sari' | 'modern';
  c1: string; c2?: string; c3?: string; // main, secondary (shawl), trim
  jewel?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Puppet: full-body cut-out character.  Origin = between the feet.   */
/* ------------------------------------------------------------------ */
export const Puppet: React.FC<{
  id: string; L: Look; outfit: Outfit; pose: Pose; e: Expr; x: number; y: number; s?: number; dir?: number; turn?: number;
  seed?: number; rim?: string; light?: number; shadow?: number; shadowDir?: number; lod?: number; blink?: boolean; seated?: boolean; prop?: 'phone' | 'scroll' | 'drum';
}> = ({id, L, outfit, pose: p, e, x, y, s = 1, dir = 1, turn = 0.25, seed = 1, rim, light: key = -0.6, shadow = 0.45, shadowDir = 1, lod = 1, blink = true, seated = false, prop}) => {
  const t = useT();
  const br = Math.sin(t * 1.5 + seed) * 2.5; // breathing
  const sway = Math.sin(t * 1.1 + seed * 2) * 1.5;
  const skin = L.skin, sh = L.shade;
  const hipY = (seated ? -70 : -260) + p.hipY;
  const hip: [number, number] = [p.hipX, hipY];
  const lean = p.lean + sway * 0.3;
  // limb chains
  const chain = (ox: number, oy: number, a1: number, l1: number, a2: number, l2: number) => {
    const j = [ox + Math.sin(rad(a1)) * l1, oy + Math.cos(rad(a1)) * l1] as [number, number];
    const k = [j[0] + Math.sin(rad(a1 + a2)) * l2, j[1] + Math.cos(rad(a1 + a2)) * l2] as [number, number];
    return [j, k];
  };
  const [lK, lA] = chain(hip[0] + 28, hip[1], p.lHip, 140, p.lKnee, 128);
  const [rK, rA] = chain(hip[0] - 28, hip[1], p.rHip, 140, p.rKnee, 128);
  // torso frame (rotated by lean around the hip)
  const T = (px: number, py: number): [number, number] => {
    const a = rad(lean);
    const dx = px, dy = py;
    return [hip[0] + dx * Math.cos(a) - dy * Math.sin(a), hip[1] + dx * Math.sin(a) + dy * Math.cos(a) + br * (py < -100 ? 0.5 : 0)];
  };
  const shL = T(50, -172), shR = T(-50, -172), neck = T(0, -186), headC = T(0, -246);
  const [lE, lW] = chain(shL[0], shL[1], p.lSh + lean, 112, p.lEl, 100);
  const [rE, rW] = chain(shR[0], shR[1], p.rSh + lean, 112, p.rEl, 100);
  const c1 = outfit.c1, c2 = outfit.c2 ?? mixColor(c1, '#000', 0.3), c3 = outfit.c3 ?? '#d9a63a';
  const dark = mixColor(c1, '#000', 0.35);
  const long = outfit.kind === 'robe' || outfit.kind === 'sari' || outfit.kind === 'monk';
  const trousers = outfit.kind === 'modern';
  const torso = `M ${T(-38, -6).join(' ')} C ${T(-34, -60).join(' ')} ${T(-40, -110).join(' ')} ${T(-60, -150).join(' ')} Q ${T(-62, -172).join(' ')} ${T(-40, -180).join(' ')} Q ${T(-20, -186).join(' ')} ${T(-16, -176).join(' ')} Q ${T(0, -160).join(' ')} ${T(16, -176).join(' ')} Q ${T(20, -186).join(' ')} ${T(40, -180).join(' ')} Q ${T(62, -172).join(' ')} ${T(60, -150).join(' ')} C ${T(40, -110).join(' ')} ${T(34, -60).join(' ')} ${T(38, -6).join(' ')} Z`;
  const kneeMid = [(lK[0] + rK[0]) / 2, (lK[1] + rK[1]) / 2];
  const legsCloth = long
    ? `M ${T(-42, -20).join(' ')} L ${T(42, -20).join(' ')} C ${hip[0] + 56} ${lK[1]} ${Math.min(lA[0], hip[0] + 60) + 26} ${lA[1] - 30} ${Math.min(lA[0], hip[0] + 60) + 24} ${lA[1] - 6} L ${Math.max(rA[0], hip[0] - 60) - 24} ${rA[1] - 6} C ${Math.max(rA[0], hip[0] - 60) - 26} ${rA[1] - 30} ${hip[0] - 56} ${rK[1]} ${T(-48, -20).join(' ')} Z`
    : `M ${T(-48, -20).join(' ')} L ${T(48, -20).join(' ')} C ${lK[0] + 34} ${lK[1] - 40} ${lK[0] + 26} ${lK[1]} ${lK[0] + 24} ${lK[1] + 22} L ${kneeMid[0] + 8} ${kneeMid[1] + 10} L ${rK[0] - 24} ${rK[1] + 22} C ${rK[0] - 26} ${rK[1]} ${rK[0] - 34} ${rK[1] - 40} ${T(-48, -20).join(' ')} Z`;
  const shawlSwing = Math.sin(t * 1.6 + seed) * 6;
  const rimC = rim ?? mixColor(L.hi, '#ffffff', 0.3);
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
      {/* contact shadow */}
      {shadow > 0 && <ellipse cx={shadowDir * 40} cy={4} rx={130} ry={18} fill="#000" opacity={lod > 0.5 ? shadow : shadow * 0.6} style={lod > 0.5 ? {filter: 'blur(8px)'} : undefined} />}
      {/* back arm */}
      <Limb a={shR} b={rE} wa={14} wb={11} fill={long ? c1 : skin} shade={long ? dark : sh} rim={rimC} key2={key} />
      <Limb a={rE} b={rW} wa={11} wb={8} fill={long && outfit.kind !== 'monk' ? c1 : skin} shade={long ? dark : sh} rim={rimC} key2={key} />
      <Hand x={rW[0]} y={rW[1]} ang={p.rSh + p.rEl + p.rWr + lean} kind={p.rHand} fill={skin} shade={sh} />
      {!seated && (<>
      {/* legs */}
      {[[rK, rA, p.rHip + p.rKnee], [lK, lA, p.lHip + p.lKnee]].map(([k, a, ang]: any, i) => (
        <g key={i}>
          <Limb a={i ? [hip[0] + 28, hip[1]] : [hip[0] - 28, hip[1]]} b={k} wa={20} wb={14} fill={skin} shade={sh} key2={key} />
          <Limb a={k} b={a} wa={14} wb={9} fill={skin} shade={sh} key2={key} />
          <path transform={`translate(${a[0]},${a[1]}) rotate(${ang * 0.3})`} d="M -14 -8 C -16 6 -6 12 30 12 C 40 12 42 2 30 -4 L 6 -10 Z" fill={outfit.kind === 'modern' ? '#1a1a1e' : mixColor(skin, '#000', 0.15)} />
        </g>
      ))}
      {/* lower garment */}
      {trousers ? (
        <g>
          <Limb a={[hip[0] - 22, hip[1]]} b={rK} wa={24} wb={19} fill={c2} shade="#000" key2={key} />
          <Limb a={rK} b={[rA[0], rA[1] - 8]} wa={19} wb={15} fill={c2} shade="#000" key2={key} />
          <Limb a={[hip[0] + 22, hip[1]]} b={lK} wa={24} wb={19} fill={c2} shade="#000" key2={key} />
          <Limb a={lK} b={[lA[0], lA[1] - 8]} wa={19} wb={15} fill={c2} shade="#000" key2={key} />
          <path d={`M ${T(-44, -24).join(' ')} L ${T(44, -24).join(' ')} L ${T(40, 10).join(' ')} L ${T(-40, 10).join(' ')} Z`} fill={c2} />
        </g>
      ) : (
        <path d={legsCloth} fill={outfit.kind === 'royal' ? c1 : long ? c1 : '#ece4d0'} />
      )}
      {!long && !trousers && <path d={`M ${T(0, -16).join(' ')} Q ${kneeMid[0] + 6} ${kneeMid[1] - 20} ${kneeMid[0] + 10} ${kneeMid[1] + 14}`} stroke={mixColor('#ece4d0', '#000', 0.25)} strokeWidth={4} fill="none" />}
      {long && [0, 1, 2].map((k) => <path key={k} d={`M ${T(-20 + k * 20, -10).join(' ')} Q ${lerp(rA[0], lA[0], 0.3 + k * 0.2) + sway * 2} ${(lK[1] + lA[1]) / 2} ${lerp(rA[0], lA[0], 0.25 + k * 0.25)} ${lA[1] - 10}`} stroke={dark} strokeWidth={3} opacity={0.5} fill="none" />)}
      </>)}
      {seated && (
        <g>
          <path d={`M ${hip[0] - 150} ${hip[1] + 60} C ${hip[0] - 160} ${hip[1] + 10} ${hip[0] - 60} ${hip[1] - 20} ${hip[0]} ${hip[1] - 10} C ${hip[0] + 60} ${hip[1] - 20} ${hip[0] + 160} ${hip[1] + 10} ${hip[0] + 150} ${hip[1] + 60} C ${hip[0] + 80} ${hip[1] + 80} ${hip[0] - 80} ${hip[1] + 80} ${hip[0] - 150} ${hip[1] + 60} Z`} fill={long ? c1 : '#ece4d0'} />
          <path d={`M ${hip[0] - 120} ${hip[1] + 40} Q ${hip[0]} ${hip[1] + 10} ${hip[0] + 120} ${hip[1] + 40}`} stroke={long ? dark : mixColor('#ece4d0', '#000', 0.25)} strokeWidth={4} fill="none" />
          <ellipse cx={hip[0] + 110} cy={hip[1] + 52} rx={30} ry={12} fill={skin} />
          <ellipse cx={hip[0] - 110} cy={hip[1] + 52} rx={30} ry={12} fill={skin} />
        </g>
      )}
      {/* torso */}
      <path d={torso} fill={outfit.kind === 'dhoti' ? skin : c1} />
      {outfit.kind === 'dhoti' && <path d={torso} fill={sh} opacity={0.25} transform={`translate(${-key * 10},0)`} clipPath={`url(#tc_${id})`} />}
      <defs><clipPath id={`tc_${id}`}><path d={torso} /></clipPath></defs>
      <g clipPath={`url(#tc_${id})`}>
        <rect x={hip[0] + (key < 0 ? 10 : -120)} y={hip[1] - 220} width={110} height={240} fill="#000" opacity={0.18} style={lod > 0.5 ? {filter: 'blur(14px)'} : undefined} />
        {/* shawl (uttariya) across the chest */}
        {(outfit.kind === 'dhoti' || outfit.kind === 'royal' || outfit.kind === 'monk') && (
          <path d={`M ${shL[0] + 10} ${shL[1] - 6} L ${shL[0] - 20} ${shL[1] - 10} L ${T(-50, -40).join(' ')} L ${T(-30, -10).join(' ')} Z`} fill={c2} />
        )}
        {outfit.kind === 'robe' && <path d={`M ${T(0, -186).join(' ')} L ${T(0, -10).join(' ')}`} stroke={dark} strokeWidth={4} opacity={0.6} />}
        {outfit.kind === 'modern' && <path d={`M ${T(-14, -186).join(' ')} L ${T(0, -150).join(' ')} L ${T(14, -186).join(' ')}`} stroke={c3} strokeWidth={3} fill="none" />}
      </g>
      {(outfit.kind === 'dhoti' || outfit.kind === 'royal' || outfit.kind === 'monk') && (
        <path d={`M ${shR[0] + 6} ${shR[1]} C ${shR[0] - 14} ${shR[1] + 60} ${shR[0] - 10 + shawlSwing} ${shR[1] + 140} ${shR[0] - 4 + shawlSwing * 1.5} ${shR[1] + 190} L ${shR[0] + 16 + shawlSwing * 1.5} ${shR[1] + 186} C ${shR[0] + 10} ${shR[1] + 120} ${shR[0] + 16} ${shR[1] + 40} ${shR[0] + 26} ${shR[1] + 4} Z`} fill={c2} />
      )}
      <path d={torso} fill="none" stroke={rimC} strokeWidth={2} opacity={0.5} />
      {outfit.jewel && (
        <g>
          <path d={`M ${T(-26, -180).join(' ')} Q ${T(0, -140).join(' ')} ${T(26, -180).join(' ')}`} stroke={c3} strokeWidth={6} fill="none" />
          <circle cx={T(0, -152)[0]} cy={T(0, -152)[1]} r={6} fill="#b3122e" />
          <path d={`M ${T(-46, -14).join(' ')} L ${T(46, -14).join(' ')}`} stroke={c3} strokeWidth={8} />
        </g>
      )}
      {/* head (face rig) */}
      <g transform={`rotate(${p.headTilt * 0.6}, ${neck[0]}, ${neck[1]})`}>
        {lod > 0.5 ? (
          <Face id={`pf_${id}`} L={{...L, outfit: 'none'}} e={e} x={headC[0]} y={headC[1]} s={0.4} turn={turn} tilt={p.headTilt * 0.4} seed={seed} blink={blink} body={false} breathe={false} />
        ) : (
          <SimpleHead L={L} x={headC[0]} y={headC[1]} turn={turn} />
        )}
      </g>
      {/* front arm (drawn last) */}
      <Limb a={shL} b={lE} wa={14} wb={11} fill={long ? c1 : skin} shade={long ? dark : sh} rim={rimC} key2={key} />
      <Limb a={lE} b={lW} wa={11} wb={8} fill={long && outfit.kind !== 'monk' ? c1 : skin} shade={long ? dark : sh} rim={rimC} key2={key} />
      <Hand x={lW[0]} y={lW[1]} ang={p.lSh + p.lEl + p.lWr + lean} kind={p.lHand} fill={skin} shade={sh} />
      {prop === 'phone' && (
        <g transform={`translate(${lW[0]},${lW[1] + 16}) rotate(${-(p.lSh + p.lEl + p.lWr + lean) * 0.2})`}>
          <rect x={-16} y={-30} width={32} height={58} rx={6} fill="#0a0a10" />
          <rect x={-13} y={-26} width={26} height={50} rx={4} fill="#8ac8ff" />
          <circle cx={0} cy={-40} r={80} fill="#8ac8ff" opacity={0.12} />
        </g>
      )}
      {prop === 'scroll' && <g transform={`translate(${lW[0]},${lW[1] + 10})`}><rect x={-60} y={-12} width={120} height={24} rx={10} fill="#d8b878" /><circle cx={-60} cy={0} r={14} fill="#8a5a2a" /><circle cx={60} cy={0} r={14} fill="#8a5a2a" /></g>}
      {prop === 'drum' && <g transform={`translate(${lW[0] - 10},${lW[1] + 40})`}><rect x={-46} y={-40} width={92} height={80} rx={10} fill="#8a3a1a" /><ellipse cx={0} cy={-40} rx={46} ry={12} fill="#e8d8b0" /><path d="M -46 -30 L 46 30 M 46 -30 L -46 30" stroke="#e8c27a" strokeWidth={3} /></g>}
      {outfit.jewel && <circle cx={lerp(shL[0], lE[0], 0.5)} cy={lerp(shL[1], lE[1], 0.5)} r={12} fill="none" stroke={c3} strokeWidth={5} />}
    </g>
  );
};

/** cheap head for crowds (level of detail) */
export const SimpleHead: React.FC<{L: Look; x: number; y: number; turn?: number}> = ({L, x, y, turn = 0}) => (
  <g transform={`translate(${x},${y}) scale(0.4)`}>
    {L.head === 'hood' || L.head === 'veil' ? <path d="M -150 200 C -170 -40 -120 -200 0 -215 C 120 -200 170 -40 150 200 Z" fill={L.head === 'veil' ? L.veilColor ?? '#734' : L.hoodColor ?? '#222'} /> : null}
    <ellipse cx={turn * 10} cy={0} rx={104} ry={150} fill={L.skin} />
    <ellipse cx={turn * 10 - 40} cy={20} rx={60} ry={130} fill={L.shade} opacity={0.35} />
    {[-1, 1].map((sd) => <ellipse key={sd} cx={sd * 42 + turn * 20} cy={-16} rx={12} ry={8} fill="#1a0c06" />)}
    {[-1, 1].map((sd) => <path key={'b' + sd} d={`M ${sd * 20 + turn * 20} -54 L ${sd * 72 + turn * 20} -50`} stroke={L.hair} strokeWidth={12} strokeLinecap="round" />)}
    <path d={`M ${-26 + turn * 20} 90 Q ${turn * 20} 100 ${26 + turn * 20} 90`} stroke="#3a1408" strokeWidth={8} fill="none" />
    {L.mustache && L.mustache !== 'none' && <path d={`M ${-40 + turn * 20} 70 Q ${turn * 20} 56 ${40 + turn * 20} 70`} stroke={L.hair} strokeWidth={14} fill="none" strokeLinecap="round" />}
    {(L.head === 'turban' || L.head === 'turban-plain') && <path d="M -118 -40 C -150 -150 -90 -250 0 -262 C 90 -250 150 -150 118 -40 C 60 -76 -60 -76 -118 -40 Z" fill={L.turbanColor ?? '#e8dcc0'} />}
    {L.head === 'hair-bun' && <path d="M -112 -40 C -120 -150 120 -150 112 -40 C 60 -110 -60 -110 -112 -40 Z M -60 -150 a 70 60 0 1 0 120 0 a 70 60 0 1 0 -120 0" fill={L.hair} />}
    {(L.head === 'none' || L.head === 'side-part' || !L.head) && <path d="M -112 -40 C -120 -150 120 -170 112 -40 C 60 -110 -60 -110 -112 -40 Z" fill={L.hair} />}
    {L.head === 'hood' && <path d="M -120 -30 C -100 -160 100 -160 120 -30 C 60 -90 -60 -90 -120 -30 Z" fill={L.hoodColor ?? '#222'} />}
  </g>
);
