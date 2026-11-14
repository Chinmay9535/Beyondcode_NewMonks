import React from 'react';
import {Composition} from 'remotion';
import {Sheet} from './Sheet';
import {Film} from './Film';
import {Thumb} from './Thumb';
import TL from './timeline.json';
export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={Math.round((TL as any).total * 30)} fps={30} width={1920} height={1080} />
    <Composition id="Thumb" component={Thumb} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Sheet" component={Sheet} durationInFrames={60} fps={30} width={1920} height={1080} />
  </>
);
