import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {clamp} from './util';

export type Shot = {from: number; to: number; fadeIn?: number; render: (off: number) => React.ReactNode; dip?: boolean};

/** Renders shots on a scene timeline (seconds). A shot with fadeIn crossfades over the previous one. */
export const Shots: React.FC<{shots: Shot[]; total: number}> = ({shots, total}) => {
  return (
    <>
      {shots.map((s, i) => {
        const next = shots[i + 1];
        const tail = next?.fadeIn ?? 0;
        const from = Math.round(s.from * 30);
        const end = Math.min(total, s.to + tail);
        const dur = Math.max(1, Math.round(end * 30) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <FadeWrap fadeIn={s.fadeIn ?? 0}>{s.render(s.from)}</FadeWrap>
          </Sequence>
        );
      })}
    </>
  );
};

const FadeWrap: React.FC<{fadeIn: number; children: React.ReactNode}> = ({fadeIn, children}) => {
  const f = useCurrentFrame();
  const o = fadeIn > 0 ? clamp(f / (fadeIn * 30)) : 1;
  return <div style={{position: 'absolute', inset: 0, opacity: o, overflow: 'hidden'}}>{children}</div>;
};
