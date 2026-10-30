export interface InstrumentSnapshot {
  symbol: string;
  lastPriceCents: number | null;
  bidCents: number | null;
  askCents: number | null;
  bidQuantity: number | null;
  askQuantity: number | null;
  volume: number;
  notionalCents: number;
}
