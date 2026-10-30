import { InstrumentSnapshot } from './instrument-snapshot.model';

export function spreadCents({
  askCents,
  bidCents,
}: Pick<InstrumentSnapshot, 'askCents' | 'bidCents'>): number | null {
  if (!askCents) return null;
  if (!bidCents) return null;

  return askCents - bidCents;
}

export function vwapCents({
  notionalCents,
  volume,
}: Pick<InstrumentSnapshot, 'notionalCents' | 'volume'>): number | null {
  if (volume === 0) return null;

  return notionalCents / volume;
}

export function imbalance({
  bidQuantity,
  askQuantity,
}: Pick<InstrumentSnapshot, 'bidQuantity' | 'askQuantity'>): number | null {
  if (bidQuantity === null) return null;
  if (askQuantity === null) return null;

  const sum = bidQuantity + askQuantity;

  if (sum === 0) return null;

  return (bidQuantity - askQuantity) / sum;
}
