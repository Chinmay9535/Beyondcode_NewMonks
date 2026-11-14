import {Look} from './face';

/** Emperor Ashoka (war years): royal Mauryan turban, gold, kohl, curled moustache */
export const ASHOKA: Look = {
  skin: '#a86a42', shade: '#5e331c', hi: '#e0a070', lip: '#7d3f2c', eye: '#3b200f', hair: '#1a0e08',
  jaw: 1.04, cheek: 1.02, kohl: 0.9, mustache: 'royal', beard: 'stubble', head: 'turban', turbanColor: '#efe2c2', jewel: '#b3122e',
  earrings: '#e2b54a', outfit: 'armor', outfitColor: '#5a3a22', outfitColor2: '#3a2414', key: -0.6,
};
/** Ashoka after Kalinga: plain white, no jewels */
export const ASHOKA_WHITE: Look = {...ASHOKA, head: 'turban-plain', turbanColor: '#f2eee4', outfit: 'white', outfitColor: '#ece6d8', outfitColor2: '#d2c9b4', earrings: undefined, jewel: undefined};
export const ASHOKA_ROYAL: Look = {...ASHOKA, outfit: 'royal', outfitColor: '#7a1e22', outfitColor2: '#4d1014'};

/** A Kalinga mother */
export const MOTHER: Look = {
  skin: '#8a5534', shade: '#4a2814', hi: '#c78655', lip: '#6a2e22', eye: '#2a1408', hair: '#140a06',
  jaw: 0.9, cheek: 0.95, chin: 0.97, kohl: 0.6, mustache: 'none', beard: 'none', head: 'veil', veilColor: '#7a2a2a',
  mark: 'bindi', noseRing: true, outfit: 'sari', outfitColor: '#7a2a2a', outfitColor2: '#4a1616', key: 0.5,
};
/** Buddhist monk (Upagupta) */
export const MONK: Look = {
  skin: '#9a6440', shade: '#553018', hi: '#d69a68', lip: '#76402c', eye: '#2c1a0c', hair: '#3a2a20',
  jaw: 0.96, age: 0.75, kohl: 0, mustache: 'none', beard: 'none', head: 'bald', outfit: 'saffron', outfitColor: '#c8702a', outfitColor2: '#9a4a14', key: 0.5,
};
/** Talbot Mundy, 1923 */
export const MUNDY: Look = {
  skin: '#d8b090', shade: '#8a6048', hi: '#f4d4b4', lip: '#a06a5a', eye: '#4a5a6a', hair: '#3a2c22',
  jaw: 1.0, age: 0.35, kohl: 0, mustache: 'full', beard: 'none', head: 'side-part', outfit: 'suit', outfitColor: '#3a3430', outfitColor2: '#242020', key: 0.7,
};

/** The Nine Unknown — each has his own face and the colour of his book */
const H = (o: Partial<Look>): Look => ({
  skin: '#94603c', shade: '#4a2814', hi: '#cc8e60', lip: '#6c3424', eye: '#26160a', hair: '#1a1008',
  head: 'hood', hoodColor: '#1c1a1e', outfit: 'robe', outfitColor: '#1c1a1e', outfitColor2: '#121014', kohl: 0.4, mustache: 'none', beard: 'none', ...o,
});
export const NINE: {look: Look; color: string; book: string; numeral: string; expr: string}[] = [
  {look: H({age: 0.5, beard: 'goatee', mustache: 'thin', hair: '#2a2420', mark: 'none', jaw: 0.95}), color: '#e23b3b', book: 'PROPAGANDA', numeral: 'I', expr: 'sly'},
  {look: H({age: 0.3, head: 'hood', mark: 'tilak', jaw: 1.08, skin: '#7c4a2c', shade: '#3c200e', hi: '#b47a50'}), color: '#7fe0d0', book: 'PHYSIOLOGY', numeral: 'II', expr: 'stern'},
  {look: H({age: 0.6, cheek: 0.9, jaw: 0.86, chin: 1.04, mustache: 'thin', hair: '#4a4038'}), color: '#7be36a', book: 'MICROBIOLOGY', numeral: 'III', expr: 'neutral'},
  {look: H({age: 0.45, jaw: 1.14, cheek: 1.08, mustache: 'full', earrings: '#e2b54a', hair: '#1a1008'}), color: '#ffc63a', book: 'ALCHEMY', numeral: 'IV', expr: 'proud'},
  {look: H({age: 0.05, jaw: 0.92, kohl: 0.8, skin: '#a87048', hi: '#e0a878'}), color: '#b88cff', book: 'COMMUNICATION', numeral: 'V', expr: 'awe'},
  {look: H({age: 0.8, beard: 'long', mustache: 'full', beardColor: '#b8b0a4', hair: '#a8a094'}), color: '#7cc4ff', book: 'GRAVITATION', numeral: 'VI', expr: 'serene'},
  {look: H({age: 0.4, mark: 'eye', beard: 'short', mustache: 'full', beardColor: '#2a2018'}), color: '#6a7bff', book: 'COSMOLOGY', numeral: 'VII', expr: 'neutral'},
  {look: H({age: 0.35, mark: 'scar', jaw: 1.05, skin: '#8a5838'}), color: '#f4f4ff', book: 'LIGHT', numeral: 'VIII', expr: 'stern'},
  {look: H({age: 1.0, beard: 'long', mustache: 'full', beardColor: '#e8e4dc', hair: '#e0dcd4', cheek: 0.94}), color: '#d9a066', book: 'SOCIOLOGY', numeral: 'IX', expr: 'troubled'},
];
