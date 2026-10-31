import { InstrumentSnapshot } from './instrument-snapshot.model';

const BASE = [
  'ALPH',
  'BETA',
  'GAMM',
  'DELT',
  'EPSI',
  'ZETA',
  'ETA',
  'THET',
  'IOTA',
  'KAPP',
  'LAMB',
  'MU',
  'NU',
  'XI',
  'OMIC',
  'PI',
  'RHO',
  'SIGM',
  'TAU',
  'UPSI',
  'PHI',
  'CHI',
  'PSI',
  'OME',
] as const;

const ENG_LETTERS_COUNT = 26;
const ASCII_OFFSET = 65;

function convertToExcelColumn(index: number): string {
  if (index < 0) return '';

  const remainder = index % ENG_LETTERS_COUNT;
  const nextIndex = Math.floor(index / ENG_LETTERS_COUNT) - 1;

  return convertToExcelColumn(nextIndex) + String.fromCharCode(remainder + ASCII_OFFSET);
}

export function instrumentSymbol(index: number): string {
  if (index < 0) throw new Error("Index shouldn't be lower than 0");

  const cycle = Math.floor(index / BASE.length);
  const base = BASE[index % BASE.length];

  return cycle === 0 ? base : `${base}.${convertToExcelColumn(cycle)}`;
}

export function emptyInstrument(index: number): InstrumentSnapshot {
  return {
    symbol: instrumentSymbol(index),
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQuantity: null,
    askQuantity: null,
    volume: 0,
    notionalCents: 0,
  };
}
