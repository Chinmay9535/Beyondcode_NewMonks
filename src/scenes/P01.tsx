import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {Shots} from '../lib/shots';
import {W, H, scene, at, atPhrase, ramp, useT, clamp, lerp, rnd, easeOut, easeInOut, mixColor} from '../lib/util';
import {Glow, Vignette, Black, Particles} from '../lib/fx';
import {Face, exprTrack, EX} from '../chars/face';
import {Puppet, P, walk, poseTrack} from '../chars/puppet';
import {KEEPER, KEEPER_FIT, folk} from '../chars/cast2';
import {BazaarLayers} from './Bazaar';

const sc = scene('p01_whisper');

/* A: crane down through the lanterns */
const Crane: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, y: -520, z: 1.25, f: 1.5}, {t: 5.5, y: 40, z: 1.0, f: 0.85, ease: easeInOut}]} dof={10}>
        <BazaarLayers tod="night" />
      </Camera>
      <Vignette strength={0.85} />
      <Black o={1 - ramp(t, 0.2, 2.6)} />
    </AbsoluteFill>
  );
};

/* B: the whisper */
const Whisper: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const lean = ramp(t, 0, 1.2, easeOut);
  const lips = Math.max(0, Math.sin(t * 9)) * 0.25 * (t > 0.6 && t < 3.6 ? 1 : 0);
  const merchant = folk(3).L;
  const eM = exprTrack([[0, {...EX.neutral, lookX: -0.4}], [1.4, {...EX.shock, lookX: -0.2, open: 0.15}, 0.7], [3.2, {...EX.troubled, lookX: 0.3}, 0.8]], t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, x: 0, f: 1}, {t: 5, z: 1.08, x: 30, f: 1}]} dof={14} drift={0.5}>
        <BazaarLayers tod="night" fg={false} />
        <Layer depth={1}>
          <Glow x={1200} y={300} r={700} color="#ffb347" opacity={0.25} />
          <Face id="mer" L={{...merchant, ambient: '#a07a6a', ambientK: 0.3, rim: '#ffb347', rimSide: 1, key: 0.8}} e={eM} x={1180} y={580} s={1.55} turn={-0.25} seed={5} />
          <Face id="kw" L={{...KEEPER, ambient: '#5a4a6a', ambientK: 0.45, rim: '#ffb347', rimSide: 1, key: 0.8}} e={{...EX.sly, lid: 0.45, lookX: 0.9, open: lips, smile: 0.25}} x={640 + lean * 160} y={600 + lean * 10} s={1.6} turn={0.55} tilt={8 * lean} seed={6} />
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};

/* C: by sunset a hundred have heard it — the rumour jumps from head to head */
const Spread: React.FC = () => {
  const t = useT();
  const hops = Math.floor(t * 7);
  const arcs = [];
  for (let i = 0; i < Math.min(hops, 40); i++) {
    const x0 = 200 + rnd(i * 3 + 1) * 1500, x1 = 200 + rnd(i * 3 + 2) * 1500;
    const y0 = 700 + rnd(i * 5) * 160, y1 = 700 + rnd(i * 5 + 1) * 160;
    const age = t - i / 7;
    const k = clamp(age / 0.5);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 140;
    const px = lerp(lerp(x0, mx, k), lerp(mx, x1, k), k), py = lerp(lerp(y0, my, k), lerp(my, y1, k), k);
    arcs.push(
      <g key={i} opacity={clamp(1 - (age - 0.5) / 2.5)}>
        <path d={`M ${x0} ${y0} Q ${mx} ${my} ${px} ${py}`} stroke="#ffd27a" strokeWidth={2.5} fill="none" style={{filter: 'drop-shadow(0 0 6px #ffb347)'}} />
        <circle cx={px} cy={py} r={5} fill="#fff4c0" />
        {k >= 1 && <circle cx={x1} cy={y1} r={10 + (age - 0.5) * 20} fill="none" stroke="#ffd27a" strokeWidth={2} opacity={clamp(1 - (age - 0.5))} />}
      </g>,
    );
  }
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.15, y: -60, f: 0.55}, {t: 5, z: 1.0, y: 0, f: 0.55}]} dof={8}>
        <BazaarLayers tod="dusk" crowd={1.4} />
        <Layer depth={0.55}>{arcs}</Layer>
      </Camera>
      <div style={{position: 'absolute', right: 160, top: 170, fontFamily: "'Cinzel', serif", fontSize: 30, letterSpacing: 8, color: '#ffe2b0', textShadow: '0 2px 12px #000', opacity: ramp(t, 0.4, 1.2)}}>
        {Math.min(100, Math.floor(1 + t * 22))} heard
      </div>
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};

/* D: by morning the whole city believes it — every head turns at once */
const Believe: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const tc = at(sc, 'city') - off;
  const turn = ramp(t, tc - 0.6, tc + 0.4);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, y: 0, f: 0.85}, {t: 5, z: 1.12, y: 30, f: 0.85}]} dof={6}>
        <BazaarLayers tod="dawn" crowd={1.6} turnTo={lerp(0.6, 0, turn)} still={turn} crowdE={{...EX.neutral, lid: 0.95, lookX: 0}} fg={false} />
      </Camera>
      <div style={{position: 'absolute', inset: 0, background: '#c8a890', opacity: 0.12 * turn, mixBlendMode: 'multiply'}} />
      <Vignette strength={0.7 + turn * 0.2} />
    </AbsoluteFill>
  );
};

/* E: the keeper walks away */
const Leaves: React.FC = () => {
  const t = useT();
  const pose = walk(P.stand, t * 5.5, 0.8);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, x: 0, z: 1.05, f: 1}, {t: 4, x: -140, z: 1.05, f: 1}]} dof={9}>
        <BazaarLayers tod="dawn" crowd={1} still={1} turnTo={0} fg={false} />
        <Layer depth={1}>
          <Puppet id="kleave" L={{...KEEPER, ambient: '#a8909a', ambientK: 0.3}} outfit={KEEPER_FIT} pose={pose} e={{...EX.neutral, lookX: -0.6}} x={1200 - t * 85} y={1020} s={1.15} dir={-1} turn={0.5} seed={3} />
        </Layer>
      </Camera>
      <Vignette strength={0.8} />
    </AbsoluteFill>
  );
};

/* F: the smile */
const Smile: React.FC<{off: number}> = ({off}) => {
  const t = useT();
  const end = sc.dur - off;
  const e = exprTrack([[0, {...EX.neutral, lookX: -0.8, lid: 0.6}], [0.8, {...EX.sly, lookX: 0}, 0.6], [2.0, {...EX.sly, lookX: 0, smile: 0.6}, 0.6]], t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Camera keys={[{t: 0, z: 1.0, f: 1}, {t: end, z: 1.12, f: 1}]} dof={16} drift={0.4}>
        <BazaarLayers tod="dawn" crowd={1} still={1} turnTo={0} fg={false} />
        <Layer depth={1}>
          <Face id="ksm" L={{...KEEPER, ambient: '#a08090', ambientK: 0.35, rim: '#fff0d0', rimSide: -1, key: -0.6}} e={e} x={880} y={590} s={2.1} turn={lerp(-0.4, 0.05, ramp(t, 0.2, 1.2))} seed={7} />
        </Layer>
      </Camera>
      <Vignette strength={0.85} />
      <Black o={ramp(t, end - 0.9, end - 0.3)} />
    </AbsoluteFill>
  );
};

export const P01: React.FC = () => {
  const b = [at(sc, 'Whispered') - 0.4, at(sc, 'By', 1) - 0.3, at(sc, 'By', 2) - 0.3, at(sc, 'No') - 0.3, at(sc, 'And') - 0.3];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shots
        total={sc.dur}
        shots={[
          {from: 0, to: b[0], render: () => <Crane />},
          {from: b[0], to: b[1], fadeIn: 0.5, render: (o) => <Whisper off={o} />},
          {from: b[1], to: b[2], fadeIn: 0.6, render: () => <Spread />},
          {from: b[2], to: b[3], fadeIn: 0.9, render: (o) => <Believe off={o} />},
          {from: b[3], to: b[4], fadeIn: 0.5, render: () => <Leaves />},
          {from: b[4], to: sc.dur, fadeIn: 0.4, render: (o) => <Smile off={o} />},
        ]}
      />
    </AbsoluteFill>
  );
};
