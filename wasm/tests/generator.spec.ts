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
const BATCH_SIZE = 1000;

function readBatch(generator: MarketGeneratorExports, written: number): MarketUpdate[] {
  const view = new Int32Array(
    generator.memory.buffer,
    generator.batchPointer(),
    written * MARKET_UPDATE_FIELD_COUNT,
  );

  return Array.from({ length: written }, (_, index) => readMarketUpdate(view, index));
}

function generate(generator: MarketGeneratorExports): MarketUpdate[] {
  return readBatch(generator, generator.generateBatch());
}

/** Many updates across several batches, so evolving state is covered too */
function generateMany(generator: MarketGeneratorExports, batches: number) {
  return Array.from({ length: batches }, () => generate(generator)).flat();
}

describe('WASM market generator', () => {
  let generator: MarketGeneratorExports;

  beforeEach(async () => {
    generator = await loadGenerator();
    generator.init(INSTRUMENT_COUNT, SEED, BATCH_SIZE);
  });

  it('loads from the compiled .wasm file', () => {
    expect(generator.memory).toBeInstanceOf(WebAssembly.Memory);
  });

  describe('batch size', () => {
    it.each([SETTINGS_LIMITS.updatesPerBatch.min, 100, SETTINGS_LIMITS.updatesPerBatch.max])(
      'fills a batch of exactly %i updates set in init',
      (size) => {
        generator.init(INSTRUMENT_COUNT, SEED, size);

        expect(generator.generateBatch()).toBe(size);
        expect(generator.generateBatch()).toBe(size);
      },
    );

    it('reallocates the buffer when re-initialized with a larger batch', () => {
      generator.init(INSTRUMENT_COUNT, SEED, 10);
      generator.init(INSTRUMENT_COUNT, SEED, 5000);
      const updates = generateMany(generator, 3);

      expect(updates).toHaveLength(15_000);
      expect(updates.filter(({ instrument }) => instrument >= INSTRUMENT_COUNT)).toEqual([]);
    });

    it('rejects a non-positive batch size', () => {
      expect(() => generator.init(INSTRUMENT_COUNT, SEED, 0)).toThrow(/aborted/);
    });

    it('rejects a non-positive instrument count', () => {
      expect(() => generator.init(0, SEED, BATCH_SIZE)).toThrow(/aborted/);
    });
  });

  describe('generated values', () => {
    let updates: MarketUpdate[];

    beforeEach(() => {
      updates = generateMany(generator, 50);
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
      twin.init(INSTRUMENT_COUNT, SEED, BATCH_SIZE);

      expect(generateMany(twin, 3)).toEqual(generateMany(generator, 3));
    });

    it('produces different batches for different seeds', async () => {
      const other = await loadGenerator();
      other.init(INSTRUMENT_COUNT, SEED + 1, BATCH_SIZE);

      expect(generate(other)).not.toEqual(generate(generator));
    });
  });

  it('covers every instrument after re-initialization with a larger count', () => {
    generator.init(50, SEED, BATCH_SIZE);
    const instruments = new Set(generateMany(generator, 10).map((u) => u.instrument));

    expect(instruments.size).toBe(50);
  });
});
