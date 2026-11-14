import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Face, EX} from './chars/face';
import {KEEPER} from './chars/cast2';
import {Glow, Vignette, CINZEL} from './lib/fx';
import {Eye} from './scenes/common';

export const Thumb: React.FC = () => (
  <AbsoluteFill style={{background: '#080203'}}>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <defs><linearGradient id="tb2" x1="0" x2="1"><stop offset="0" stopColor="#1a0406" /><stop offset="0.55" stopColor="#3a0806" /><stop offset="1" stopColor="#120204" /></linearGradient></defs>
      <rect width={1920} height={1080} fill="url(#tb2)" />
      <Glow x={1380} y={640} r={700} color="#ff2a1a" opacity={0.45} />
      <Eye x={1380} y={660} r={330} open={1} look={-0.6} />
      {/* tiny crowd under the eye, all looking up */}
      {Array.from({length: 22}).map((_, i) => <g key={i} transform={`translate(${1000 + i * 38}, ${1040 - (i % 2) * 18})`}><circle r={14} fill="#140405" /><path d="M -22 40 Q 0 8 22 40 Z" fill="#140405" /></g>)}
      <Face id="th2" L={{...KEEPER, ambient: '#ff5a3a', ambientK: 0.3, rim: '#ff6a4a', rimSide: 1, key: 0.8, hi: '#ff9a70'}} e={{...EX.sly, smile: 0.55, lid: 0.5, lookX: 0.6}} x={470} y={600} s={2.3} turn={0.25} blink={false} breathe={false} />
    </svg>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%)'}} />
    <div style={{position: 'absolute', right: 60, top: 50, textAlign: 'right', fontFamily: CINZEL, fontWeight: 900, lineHeight: 0.95}}>
      <div style={{fontSize: 66, color: '#ffe2c8', letterSpacing: 4, textShadow: '0 5px 0 #000'}}>ASHOKA'S SECRET 9 · PART 2</div>
      <div style={{fontSize: 170, color: '#ffc63a', marginTop: 10, textShadow: '0 8px 0 #3a0800, 0 0 50px rgba(255,80,20,0.6)'}}>THE FIRST</div>
      <div style={{fontSize: 170, color: '#ffc63a', textShadow: '0 8px 0 #3a0800, 0 0 50px rgba(255,80,20,0.6)'}}>BOOK</div>
    </div>
    <Vignette strength={0.6} />
  </AbsoluteFill>
);
