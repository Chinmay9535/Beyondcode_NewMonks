import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {SCENES} from './lib/util';
import {GrainImg, Paper, Letterbox} from './lib/fx';
import {P01} from './scenes/P01';
import {P02, P03, P04, P05} from './scenes/P02_05';
import {P06, P07, P08} from './scenes/P06_08';
import {P09} from './scenes/P09';
import {P10, P11, P12, P13} from './scenes/P10_13';

const MAP: Record<string, React.FC> = {
  p01_whisper: P01,
  p02_title: P02,
  p03_recap: P03,
  p04_keeper: P04,
  p05_keeper_line: P05,
  p06_edicts: P06,
  p07_ashoka_line: P07,
  p08_history: P08,
  p09_laws: P09,
  p10_ages: P10,
  p11_now: P11,
  p12_tease: P12,
  p13_card: P13,
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {SCENES.map((s) => {
      const C = MAP[s.id];
      if (!C) return null;
      return (
        <Sequence key={s.id} from={Math.round(s.start * 30)} durationInFrames={Math.round(s.dur * 30)} name={s.id}>
          <C />
        </Sequence>
      );
    })}
    <Paper opacity={0.3} brush={0.14} />
    <GrainImg opacity={0.14} />
    <Letterbox />
  </AbsoluteFill>
);
