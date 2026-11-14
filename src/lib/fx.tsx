import React from 'react';
import {useCurrentFrame} from 'remotion';
import {W, H, rnd, useT, clamp, noise1, lerp} from './util';
import {continueRender, delayRender, staticFile} from 'remotion';
import FONTS from '../fonts.json';

// local copies of Google Fonts (the render browser has no internet)
if (typeof document !== 'undefined' && !(window as any).__fontsLoaded) {
  (window as any).__fontsLoaded = true;
  const h = delayRender('fonts');
  Promise.all(
    (FONTS as [string, string, string, string][]).map(([fam, st, wt, fn]) => {
      const f = new FontFace(fam, `url(${staticFile('fonts/' + fn)}) format('woff2')`, {style: st, weight: wt});
      document.fonts.add(f);
      return f.load();
    }),
  ).then(() => continueRender(h)).catch((e) => { console.error(e); continueRender(h); });
}
export const CINZEL = "'Cinzel', serif";
export const CORM = "'Cormorant Garamond', serif";
export const CORM_I = "'Cormorant Garamond', serif"; // use with fontStyle italic
export const ELITE = "'Special Elite', monospace";

/** Animated film grain (feTurbulence, reseeded each frame) */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.09}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <filter id={`grain${f % 8}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 8} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter={`url(#grain${f % 8})`} />
    </svg>
  );
};

export const Vignette: React.FC<{strength?: number; color?: string}> = ({strength = 0.75, color = '0,0,0'}) => (
  <div
    style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(${color},0) 45%, rgba(${color},${strength * 0.6}) 80%, rgba(${color},${strength}) 100%)`,
    }}
  />
);

export const BAR = 112; // letterbox ≈ 2.35:1
export const Letterbox: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: BAR, background: '#000'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, background: '#000'}} />
  </>
);

/** Colour grade: an overlay colour with a blend mode + CSS filter applied by the parent */
export const Tint: React.FC<{color: string; opacity?: number; blend?: any}> = ({color, opacity = 0.3, blend = 'soft-light'}) => (
  <div style={{position: 'absolute', inset: 0, background: color, opacity, mixBlendMode: blend, pointerEvents: 'none'}} />
);
export const GradTint: React.FC<{bg: string; opacity?: number; blend?: any}> = ({bg, opacity = 0.5, blend = 'soft-light'}) => (
  <div style={{position: 'absolute', inset: 0, background: bg, opacity, mixBlendMode: blend, pointerEvents: 'none'}} />
);

export const Black: React.FC<{o: number}> = ({o}) => (o > 0.001 ? <div style={{position: 'absolute', inset: 0, background: '#000', opacity: clamp(o)}} /> : null);

/** Particles: dust motes / embers / ash / snow. Drawn inside an svg Layer. */
export const Particles: React.FC<{
  n: number; seed?: number; color: string; size?: [number, number]; speed?: [number, number]; // px/s vertical (neg = up)
  wind?: number; area?: [number, number, number, number]; glow?: boolean; opacity?: number; flicker?: boolean;
}> = ({n, seed = 1, color, size = [1.5, 4], speed = [-20, -60], wind = 10, area = [-200, -200, W + 400, H + 400], glow, opacity = 1, flicker}) => {
  const t = useT();
  const [ax, ay, aw, ah] = area;
  const items = [];
  for (let i = 0; i < n; i++) {
    const r1 = rnd(seed * 91 + i), r2 = rnd(seed * 37 + i * 3.1), r3 = rnd(seed * 13 + i * 7.7), r4 = rnd(seed * 5 + i * 1.3);
    const sp = lerp(speed[0], speed[1], r3);
    const s = lerp(size[0], size[1], r4);
    let y = ay + ((r2 * ah + sp * t) % ah + ah) % ah;
    let x = ax + ((r1 * aw + wind * t * (0.5 + r3) + Math.sin(t * (0.5 + r4) + i) * 20) % aw + aw) % aw;
    const fl = flicker ? 0.4 + 0.6 * noise1(t * 3 + i, seed) : 1;
    items.push(<circle key={i} cx={x} cy={y} r={s} fill={color} opacity={opacity * fl * (0.4 + 0.6 * r2)} />);
  }
  return <g style={glow ? {filter: `drop-shadow(0 0 6px ${color})`} : undefined}>{items}</g>;
};

/** Rising smoke column made of blurred puffs */
export const Smoke: React.FC<{x: number; y: number; seed?: number; color?: string; scale?: number; rise?: number; n?: number; opacity?: number; lean?: number}> = ({
  x, y, seed = 1, color = '#3a3a3a', scale = 1, rise = 40, n = 14, opacity = 0.5, lean = 30,
}) => {
  const t = useT();
  const puffs = [];
  const life = 9;
  for (let i = 0; i < n; i++) {
    const ph = ((t + (i / n) * life + rnd(seed + i) * 2) % life) / life; // 0..1 lifecycle
    const py = y - ph * rise * life * scale;
    const px = x + ph * ph * lean * life * 0.3 * scale + Math.sin(ph * 6 + i) * 15 * scale;
    const r = (30 + ph * 120) * scale * (0.7 + rnd(seed * 3 + i) * 0.6);
    const o = opacity * Math.sin(Math.PI * ph) * 0.8;
    puffs.push(<circle key={i} cx={px} cy={py} r={r} fill={color} opacity={o} />);
  }
  return <g style={{filter: `blur(${18 * scale}px)`}}>{puffs}</g>;
};

/** Volumetric light rays from a point */
export const GodRays: React.FC<{x: number; y: number; color?: string; n?: number; len?: number; spread?: number; angle?: number; opacity?: number; seed?: number}> = ({
  x, y, color = '#ffd28a', n = 9, len = 1600, spread = 50, angle = 90, opacity = 0.35, seed = 2,
}) => {
  const t = useT();
  const id = `gr${seed}`;
  const rays = [];
  for (let i = 0; i < n; i++) {
    const a = ((angle - spread / 2 + (spread * (i + 0.5)) / n + (rnd(seed + i) - 0.5) * 4) * Math.PI) / 180;
    const wdt = (0.6 + rnd(seed * 2 + i) * 2.2) * Math.PI / 180;
    const o = opacity * (0.35 + 0.65 * noise1(t * 0.4 + i * 3.3, seed));
    const p1 = [x + Math.cos(a - wdt) * len, y + Math.sin(a - wdt) * len];
    const p2 = [x + Math.cos(a + wdt) * len, y + Math.sin(a + wdt) * len];
    rays.push(<polygon key={i} points={`${x},${y} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={`url(#${id})`} opacity={o} />);
  }
  return (
    <g style={{mixBlendMode: 'screen', filter: 'blur(6px)'}}>
      <defs>
        <radialGradient id={id} cx={x} cy={y} r={len} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={1} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {rays}
    </g>
  );
};

/** soft horizontal fog band */
export const Fog: React.FC<{y: number; h: number; color: string; opacity?: number; seed?: number; speed?: number}> = ({y, h, color, opacity = 0.5, seed = 1, speed = 15}) => {
  const t = useT();
  const blobs = [];
  for (let i = 0; i < 9; i++) {
    const x = ((rnd(seed + i) * 3000 + t * speed * (0.6 + rnd(seed * 4 + i))) % 3000) - 500;
    blobs.push(<ellipse key={i} cx={x} cy={y + (rnd(seed * 2 + i) - 0.5) * h * 0.5} rx={300 + rnd(i + seed) * 300} ry={h * 0.5} fill={color} opacity={opacity * (0.5 + rnd(i * 9 + seed) * 0.5)} />);
  }
  return <g style={{filter: `blur(${h * 0.35}px)`}}>{blobs}</g>;
};

/** glow halo */
export const Glow: React.FC<{x: number; y: number; r: number; color: string; opacity?: number}> = ({x, y, r, color, opacity = 1}) => {
  const id = `glow${Math.round(x)}_${Math.round(y)}_${Math.round(r)}`;
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="0.35" stopColor={color} stopOpacity={opacity * 0.35} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
    </g>
  );
};

/** Lamp / torch flame with flicker */
export const Flame: React.FC<{x: number; y: number; s?: number; seed?: number; color?: string}> = ({x, y, s = 1, seed = 1, color = '#ffb347'}) => {
  const t = useT();
  const fl = noise1(t * 9, seed);
  const sway = (noise1(t * 3, seed + 4) - 0.5) * 8 * s;
  const h = (34 + fl * 14) * s;
  const w = 11 * s;
  return (
    <g>
      <Glow x={x} y={y - h * 0.4} r={(120 + fl * 30) * s} color={color} opacity={0.55} />
      <path d={`M ${x - w} ${y} C ${x - w * 1.1} ${y - h * 0.5}, ${x + sway - 2} ${y - h * 0.7}, ${x + sway} ${y - h} C ${x + sway + 2} ${y - h * 0.7}, ${x + w * 1.1} ${y - h * 0.5}, ${x + w} ${y} Q ${x} ${y + w * 0.9} ${x - w} ${y} Z`} fill={color} />
      <path d={`M ${x - w * 0.5} ${y} C ${x - w * 0.5} ${y - h * 0.35}, ${x + sway * 0.5} ${y - h * 0.5}, ${x + sway * 0.6} ${y - h * 0.65} C ${x + w * 0.5} ${y - h * 0.4}, ${x + w * 0.5} ${y - h * 0.2}, ${x + w * 0.5} ${y} Q ${x} ${y + w * 0.5} ${x - w * 0.5} ${y} Z`} fill="#fff4cf" />
    </g>
  );
};

export const Caption: React.FC<{t: number; a: number; b: number; children: React.ReactNode; x?: number; y?: number; size?: number; font?: string; align?: 'left' | 'center' | 'right'; color?: string; spacing?: number}> = ({
  t, a, b, children, x = 150, y = H - 190, size = 30, font, align = 'left', color = '#efe3c8', spacing = 6,
}) => {
  const o = clamp((t - a) / 0.8) * (1 - clamp((t - (b - 0.8)) / 0.8));
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: align === 'center' ? 0 : x, right: align === 'center' ? 0 : undefined, top: y, textAlign: align, fontFamily: font ?? CINZEL, fontSize: size, letterSpacing: spacing, color, opacity: o, textShadow: '0 2px 14px rgba(0,0,0,0.9)', transform: `translateY(${(1 - o) * 8}px)`}}>
      {children}
    </div>
  );
};

/** Typewriter-revealed text */
export const TypeText: React.FC<{text: string; t: number; a: number; cps?: number}> = ({text, t, a, cps = 18}) => {
  const n = Math.max(0, Math.floor((t - a) * cps));
  return <>{text.slice(0, n)}<span style={{opacity: n < text.length && n > 0 ? 1 : 0}}>▌</span></>;
};

/* ---------------- Part 2 upgrades ---------------- */
import {Img} from 'remotion';
/** pre-baked film grain (8 frames), far cheaper than per-frame turbulence */
export const GrainImg: React.FC<{opacity?: number}> = ({opacity = 0.13}) => {
  const f = useCurrentFrame();
  return <Img src={staticFile(`tex/grain${f % 8}.png`)} style={{position: 'absolute', inset: 0, width: W, height: H, opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};
/** painted-paper texture over the whole frame */
export const Paper: React.FC<{opacity?: number; brush?: number}> = ({opacity = 0.35, brush = 0.18}) => (
  <>
    <Img src={staticFile('tex/paper.png')} style={{position: 'absolute', inset: 0, width: W, height: H, opacity, mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
    {brush > 0 && <Img src={staticFile('tex/brush.png')} style={{position: 'absolute', inset: 0, width: W, height: H, opacity: brush, mixBlendMode: 'soft-light', pointerEvents: 'none'}} />}
  </>
);
