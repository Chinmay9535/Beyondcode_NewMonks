import React, {createContext, useContext} from 'react';
import {W, H, clamp, easeInOut, lerp, noise1, useT} from './util';

export type Key = {t: number; x?: number; y?: number; z?: number; r?: number; f?: number; ease?: (k: number) => number};
export type CamState = {x: number; y: number; z: number; r: number; f: number; dof: number};

export const camAt = (keys: Key[], t: number): CamState => {
  const full = keys.map((k) => ({x: 0, y: 0, z: 1, r: 0, f: 1, ...k})) as any[];
  if (t <= full[0].t) return full[0];
  for (let i = 0; i < full.length - 1; i++) {
    const a = full[i], b = full[i + 1];
    if (t <= b.t) {
      const k = (b.ease ?? easeInOut)(clamp((t - a.t) / (b.t - a.t)));
      return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), r: lerp(a.r, b.r, k), f: lerp(a.f, b.f, k), dof: 0};
    }
  }
  return full[full.length - 1];
};

const CamCtx = createContext<CamState>({x: 0, y: 0, z: 1, r: 0, f: 1, dof: 0});

/**
 * Virtual camera. x/y pan in px (at depth 1), z = zoom, r = roll (deg).
 * shake: amplitude in px of handheld/impact shake.
 */
export const Camera: React.FC<{keys: Key[]; shake?: number; children: React.ReactNode; drift?: number; dof?: number}> = ({keys, shake = 0, drift = 1, dof = 0, children}) => {
  const t = useT();
  const c = camAt(keys, t);
  // gentle handheld drift (cinematic "breathing" camera) + optional shake
  const hx = (noise1(t * 0.35, 3) - 0.5) * 10 * drift + (noise1(t * 14, 5) - 0.5) * shake;
  const hy = (noise1(t * 0.3, 7) - 0.5) * 8 * drift + (noise1(t * 13, 9) - 0.5) * shake;
  const hr = (noise1(t * 0.25, 11) - 0.5) * 0.3 * drift + (noise1(t * 10, 13) - 0.5) * shake * 0.02;
  return <CamCtx.Provider value={{x: c.x + hx, y: c.y + hy, z: c.z, r: c.r + hr, f: c.f, dof}}>{children}</CamCtx.Provider>;
};

/** A parallax plane. depth 0 = fixed to screen (sky at infinity), 1 = focal plane, >1 = foreground. */
export const Layer: React.FC<{depth?: number; blur?: number; children: React.ReactNode; style?: React.CSSProperties; svg?: boolean; opacity?: number; blend?: any}> = ({
  depth = 1, blur, children, style, svg = true, opacity = 1, blend,
}) => {
  const c = useContext(CamCtx);
  if (blur === undefined) blur = c.dof > 0 ? Math.min(28, c.dof * Math.abs(depth - c.f) * (depth < c.f ? 1 : 1.6)) : 0;
  if (blur < 0.6) blur = 0;
  const z = 1 + (c.z - 1) * depth;
  const transform = `translate(${W / 2}px, ${H / 2}px) rotate(${c.r * Math.min(depth, 1.5)}deg) scale(${z}) translate(${-W / 2 - c.x * depth}px, ${-H / 2 - c.y * depth}px)`;
  return (
    <div
      style={{
        position: 'absolute', inset: 0, transform, transformOrigin: '0 0', opacity,
        filter: blur > 0 ? `blur(${blur}px)` : undefined, mixBlendMode: blend, ...style,
      }}
    >
      {svg ? (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible', position: 'absolute', inset: 0}}>
          {children}
        </svg>
      ) : (
        children
      )}
    </div>
  );
};

export const useCam = () => useContext(CamCtx);
