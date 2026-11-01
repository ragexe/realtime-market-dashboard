import { beforeEach, describe, expect, it } from 'vitest';

import type { MarketGeneratorExports } from '../../src/domain/market-generator.model';
import {
  MARKET_UPDATE_FIELD_COUNT,
  readMarketUpdate,
  type MarketUpdate,
} from '../../src/domain/market-update.model';
import { SETTINGS_LIMITS } from '../../src/domain/producer-settings.const';
import { loadGenerator } from './load-generator';

const SEED = 42;
const INSTRUMENT_COUNT = 5;

function readBatch(generator: MarketGeneratorExports, written: number): MarketUpdate[] {
  const view = new Int32Array(
    generator.memory.buffer,
    generator.batchPointer(),
    written * MARKET_UPDATE_FIELD_COUNT,
  );

  return Array.from({ length: written }, (_, index) => readMarketUpdate(view, index));
}

function generate(generator: MarketGeneratorExports, size: number): MarketUpdate[] {
  return readBatch(generator, generator.generateBatch(size));
}

/** Many updates across several batches, so evolving state is covered too */
function generateMany(generator: MarketGeneratorExports, batches: number, size: number) {
  return Array.from({ length: batches }, () => generate(generator, size)).flat();
}

describe('WASM market generator', () => {
  let generator: MarketGeneratorExports;

  beforeEach(async () => {
    generator = await loadGenerator();
    generator.init(INSTRUMENT_COUNT, SEED);
  });

  it('loads from the compiled .wasm file', () => {
    expect(generator.memory).toBeInstanceOf(WebAssembly.Memory);
  });

  it('uses the same update layout as the worker', () => {
    expect(generator.updateFieldCount()).toBe(MARKET_UPDATE_FIELD_COUNT);
  });

  it('has a batch buffer large enough for the allowed settings', () => {
    expect(generator.maxBatchSize()).toBeGreaterThanOrEqual(SETTINGS_LIMITS.updatesPerBatch.max);
  });

  describe('batch size', () => {
    it.each([1, 100, SETTINGS_LIMITS.updatesPerBatch.max])(
      'writes exactly %i requested updates',
      (size) => {
        expect(generator.generateBatch(size)).toBe(size);
      },
    );

    it('writes nothing for an empty batch', () => {
      expect(generator.generateBatch(0)).toBe(0);
    });

    it.todo('rejects a batch larger than the buffer instead of writing past it');
  });

  describe('generated values', () => {
    let updates: MarketUpdate[];

    beforeEach(() => {
      updates = generateMany(generator, 50, 1000);
    });

    it('only references initialized instruments', () => {
      const instruments = new Set(updates.map(({ instrument }) => instrument));

      expect([...instruments].sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('keeps prices positive and the bid below the ask', () => {
      const broken = updates.filter(
        ({ bidCents, askCents }) => !(bidCents > 0 && bidCents < askCents),
      );

      expect(broken).toEqual([]);
    });

    it('trades at the bid or the ask', () => {
      const broken = updates.filter(
        ({ priceCents, bidCents, askCents }) => priceCents !== bidCents && priceCents !== askCents,
      );

      expect(broken).toEqual([]);
    });

    it('trades both sides of the book', () => {
      const atAsk = updates.filter(({ priceCents, askCents }) => priceCents === askCents).length;

      expect(atAsk).toBeGreaterThan(updates.length * 0.4);
      expect(atAsk).toBeLessThan(updates.length * 0.6);
    });

    it('keeps trade quantities positive and book quantities nonnegative', () => {
      const broken = updates.filter(
        ({ quantity, bidQuantity, askQuantity }) =>
          !(quantity > 0 && bidQuantity >= 0 && askQuantity >= 0),
      );

      expect(broken).toEqual([]);
    });

    it('evolves prices from previous values instead of jumping', () => {
      const previousBid = new Map<number, number>();
      let largestMove = 0;

      for (const { instrument, bidCents } of updates) {
        const previous = previousBid.get(instrument);
        if (previous !== undefined) {
          largestMove = Math.max(largestMove, Math.abs(bidCents - previous) / previous);
        }
        previousBid.set(instrument, bidCents);
      }

      expect(largestMove).toBeGreaterThan(0);
      expect(largestMove).toBeLessThan(0.01);
    });
  });

  describe('seed', () => {
    it('produces identical batches for the same seed', async () => {
      const twin = await loadGenerator();
      twin.init(INSTRUMENT_COUNT, SEED);

      expect(generateMany(twin, 3, 100)).toEqual(generateMany(generator, 3, 100));
    });

    it('produces different batches for different seeds', async () => {
      const other = await loadGenerator();
      other.init(INSTRUMENT_COUNT, SEED + 1);

      expect(generate(other, 100)).not.toEqual(generate(generator, 100));
    });
  });

  it('covers every instrument after re-initialization with a larger count', () => {
    generator.init(50, SEED);
    const instruments = new Set(generateMany(generator, 10, 1000).map((u) => u.instrument));

    expect(instruments.size).toBe(50);
  });
});
