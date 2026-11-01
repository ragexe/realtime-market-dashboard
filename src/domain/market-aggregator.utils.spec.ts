import { emptyInstrument } from './instrument-symbol.utils';
import type { InstrumentSnapshot } from './instrument-snapshot.model';
import { applyBatchInPlace } from './market-aggregator.utils';
import {
  MARKET_UPDATE_FIELD,
  MARKET_UPDATE_FIELD_COUNT,
  type MarketUpdate,
} from './market-update.model';
import { imbalance, spreadCents, vwapCents } from './metric-evaluators.utils';

const ALFA = 0;
const BETA = 1;
const GAMA = 2;

function encode(updates: MarketUpdate[]): Int32Array {
  const batch = new Int32Array(updates.length * MARKET_UPDATE_FIELD_COUNT);

  updates.forEach((update, index) => {
    const offset = index * MARKET_UPDATE_FIELD_COUNT;
    for (const field of Object.keys(MARKET_UPDATE_FIELD) as (keyof MarketUpdate)[]) {
      batch[offset + MARKET_UPDATE_FIELD[field]] = update[field];
    }
  });

  return batch;
}

function trade(
  instrument: number,
  priceCents: number,
  quantity: number,
  book: Partial<MarketUpdate> = {},
): MarketUpdate {
  return {
    instrument,
    priceCents,
    quantity,
    bidCents: priceCents - 1,
    askCents: priceCents,
    bidQuantity: 100,
    askQuantity: 100,
    ...book,
  };
}

function apply(instruments: InstrumentSnapshot[], updates: MarketUpdate[]): void {
  applyBatchInPlace(instruments, encode(updates), updates.length);
}

describe('applyBatchInPlace', () => {
  let instruments: InstrumentSnapshot[];

  beforeEach(() => {
    instruments = [emptyInstrument(ALFA), emptyInstrument(BETA), emptyInstrument(GAMA)];
  });

  it('reproduces the worked example from the task', () => {
    apply(instruments, [
      trade(ALFA, 10000, 10),
      trade(ALFA, 10200, 30, {
        bidCents: 10196,
        askCents: 10200,
        bidQuantity: 600,
        askQuantity: 400,
      }),
    ]);

    const alfa = instruments[ALFA];
    expect(alfa.lastPriceCents).toBe(10200);
    expect(alfa.volume).toBe(40);
    expect(vwapCents(alfa)).toBe(10150);
    expect(spreadCents(alfa)).toBe(4);
    expect(imbalance(alfa)).toBeCloseTo(0.2, 10);
  });

  it('takes last price and book from the latest update of an instrument in the batch', () => {
    apply(instruments, [
      trade(ALFA, 10000, 5, { bidCents: 9990, askCents: 10000, bidQuantity: 1, askQuantity: 2 }),
      trade(ALFA, 10010, 7, { bidCents: 10005, askCents: 10010, bidQuantity: 3, askQuantity: 4 }),
    ]);

    expect(instruments[ALFA]).toMatchObject({
      lastPriceCents: 10010,
      bidCents: 10005,
      askCents: 10010,
      bidQuantity: 3,
      askQuantity: 4,
    });
  });

  it('counts every trade of an instrument that appears several times in a batch', () => {
    apply(instruments, [trade(ALFA, 100, 1), trade(ALFA, 200, 2), trade(ALFA, 300, 3)]);

    expect(instruments[ALFA].volume).toBe(6);
    expect(instruments[ALFA].notionalCents).toBe(100 * 1 + 200 * 2 + 300 * 3);
  });

  it('keeps instruments isolated from each other', () => {
    apply(instruments, [trade(ALFA, 10000, 10), trade(BETA, 5000, 5), trade(ALFA, 10200, 30)]);

    expect(instruments[ALFA]).toMatchObject({
      lastPriceCents: 10200,
      volume: 40,
      notionalCents: 406000,
    });

    expect(instruments[BETA]).toMatchObject({
      lastPriceCents: 5000,
      volume: 5,
      notionalCents: 25000,
    });

    expect(instruments[GAMA]).toEqual(emptyInstrument(GAMA));
  });

  it('accumulates totals across batches', () => {
    apply(instruments, [trade(ALFA, 10000, 10)]);
    apply(instruments, [trade(ALFA, 10200, 30)]);

    expect(instruments[ALFA].volume).toBe(40);
    expect(vwapCents(instruments[ALFA])).toBe(10150);
  });

  it('applies only the first `count` updates of the buffer', () => {
    const batch = encode([trade(ALFA, 10000, 10), trade(ALFA, 99999, 999)]);

    applyBatchInPlace(instruments, batch, 1);

    expect(instruments[ALFA]).toMatchObject({ lastPriceCents: 10000, volume: 10 });
  });

  it('leaves state untouched for an empty batch', () => {
    applyBatchInPlace(instruments, new Int32Array(0), 0);

    expect(instruments).toEqual([
      emptyInstrument(ALFA),
      emptyInstrument(BETA),
      emptyInstrument(GAMA),
    ]);
  });
});
