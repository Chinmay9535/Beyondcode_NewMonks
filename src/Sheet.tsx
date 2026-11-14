import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Puppet, P, walk} from './chars/puppet';
import {EX} from './chars/face';
import {KEEPER, KEEPER_FIT, ASHOKA, ASHOKA_FIT, folk} from './chars/cast2';
import {useT} from './lib/util';
import {Paper, GrainImg} from './lib/fx';

export const Sheet: React.FC = () => {
  const t = useT();
  const items: any[] = [
    {L: KEEPER, fit: KEEPER_FIT, pose: P.listen, e: EX.sly},
    {L: ASHOKA, fit: ASHOKA_FIT, pose: P.command, e: EX.resolve},
    {...folk(1), pose: walk(P.stand, t * 5), e: EX.neutral},
    {...folk(2), pose: P.point, e: EX.shock},
    {...folk(4), pose: P.cower, e: EX.horror},
    {...folk(5), pose: P.cheer, e: EX.proud},
  ];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(#6a5040, #2a1c14)'}}>
      <svg width={1920} height={1080}>
        <rect y={900} width={1920} height={180} fill="#3a281c" />
        {items.map((it, i) => (
          <Puppet key={i} id={`sp${i}`} L={it.L} outfit={it.fit} pose={it.pose} e={it.e} x={170 + i * 316} y={940} s={1.25} seed={i + 1} turn={0.2} />
        ))}
      </svg>
      <Paper />
      <GrainImg />
    </AbsoluteFill>
  );
};
