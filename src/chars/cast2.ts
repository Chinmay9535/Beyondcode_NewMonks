import {Look} from './face';
import {Outfit} from './puppet';
import {ASHOKA, ASHOKA_WHITE, NINE, MOTHER} from './cast';
export {ASHOKA, ASHOKA_WHITE, NINE};

/** the Keeper of the First Book: a market listener (younger face of keeper I) */
export const KEEPER: Look = {...NINE[0].look, head: 'turban-plain', turbanColor: '#3a2a4a', age: 0.25, hair: '#1a1008', beardColor: '#1a1008', outfit: 'robe', outfitColor: '#3a2a4a', outfitColor2: '#5a1e2a'};
export const KEEPER_HOOD: Look = {...NINE[0].look, age: 0.25};
export const KEEPER_FIT: Outfit = {kind: 'dhoti', c1: '#3a2a4a', c2: '#5a1e2a', c3: '#c8922a'};
export const KEEPER_ROBE: Outfit = {kind: 'robe', c1: '#1c1a22', c2: '#141218'};
export const ASHOKA_FIT: Outfit = {kind: 'royal', c1: '#7a1e22', c2: '#e8c27a', c3: '#e2b54a', jewel: true};

const skins = [['#a86a42', '#5e331c', '#e0a070'], ['#8a5534', '#4a2814', '#c78655'], ['#c08458', '#6e4428', '#eab080'], ['#74462a', '#3a200e', '#ac7448'], ['#9a6440', '#553018', '#d69a68']];
const cloth = ['#c8702a', '#2a6a6a', '#8a2a2a', '#d8c08a', '#4a5a2a', '#6a3a7a', '#e8e0d0', '#2a3a6a', '#b08a2a'];
/** procedural townsfolk */
export const folk = (i: number): {L: Look; fit: Outfit} => {
  const sk = skins[i % skins.length];
  const woman = i % 3 === 1;
  const L: Look = {
    skin: sk[0], shade: sk[1], hi: sk[2], lip: woman ? '#7a3028' : '#6c3424', eye: '#26160a', hair: i % 7 === 0 ? '#6a6460' : '#140a06',
    jaw: woman ? 0.9 : 1 + (i % 4) * 0.03, cheek: woman ? 0.95 : 1, kohl: woman ? 0.7 : 0.3, age: (i % 5) * 0.2,
    mustache: woman ? 'none' : (['royal', 'thin', 'full', 'none'] as const)[i % 4], beard: woman ? 'none' : (['none', 'short', 'stubble', 'none', 'long'] as const)[i % 5],
    head: woman ? (i % 2 ? 'veil' : 'hair-bun') : (['turban-plain', 'none', 'turban-plain', 'side-part'] as const)[i % 4] as any,
    turbanColor: cloth[(i * 3) % cloth.length], veilColor: cloth[(i * 5 + 2) % cloth.length], mark: woman ? 'bindi' : i % 6 === 0 ? 'tilak' : 'none',
    earrings: i % 4 === 2 ? '#e2b54a' : undefined, noseRing: woman && i % 2 === 0,
  };
  const fit: Outfit = woman ? {kind: 'sari', c1: cloth[(i * 5 + 2) % cloth.length], c2: cloth[(i * 7) % cloth.length]} : {kind: 'dhoti', c1: '#ece4d0', c2: cloth[(i * 3 + 1) % cloth.length]};
  return {L, fit};
};
