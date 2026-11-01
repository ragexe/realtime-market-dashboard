import type { MarketGeneratorExports } from '../../domain/market-generator.model';
import { MARKET_UPDATE_FIELD, MARKET_UPDATE_FIELD_COUNT } from '../../domain/market-update.model';

/**
 * Deterministic stand-in for the Wasm generator: batch N writes one trade of quantity 1
 * at price 100 + N for every update, round-robin over instruments.
 */
export class FakeMarketGenerator implements MarketGeneratorExports {
  readonly memory = new WebAssembly.Memory({ initial: 1 });
  readonly initCalls: { instrumentCount: number; seed: number; batchSize: number }[] = [];
  batchesGenerated = 0;
  failOnBatch: number | null = null;

  private instrumentCount = 0;
  private batchSize = 0;

  init(instrumentCount: number, seed: number, batchSize: number): void {
    this.instrumentCount = instrumentCount;
    this.batchSize = batchSize;
    this.initCalls.push({ instrumentCount, seed, batchSize });
  }

  generateBatch(): number {
    const size = this.batchSize;
    this.batchesGenerated++;
    if (this.batchesGenerated === this.failOnBatch) {
      throw new Error('Market generator aborted at 1:1');
    }

    const batch = new Int32Array(
      this.memory.buffer,
      this.batchPointer(),
      size * MARKET_UPDATE_FIELD_COUNT,
    );
    for (let index = 0; index < size; index++) {
      const offset = index * MARKET_UPDATE_FIELD_COUNT;
      const price = 100 + this.batchesGenerated;
      batch[offset + MARKET_UPDATE_FIELD.instrument] = index % this.instrumentCount;
      batch[offset + MARKET_UPDATE_FIELD.priceCents] = price;
      batch[offset + MARKET_UPDATE_FIELD.quantity] = 1;
      batch[offset + MARKET_UPDATE_FIELD.bidCents] = price;
      batch[offset + MARKET_UPDATE_FIELD.askCents] = price + 1;
      batch[offset + MARKET_UPDATE_FIELD.bidQuantity] = 10;
      batch[offset + MARKET_UPDATE_FIELD.askQuantity] = 10;
    }
    return size;
  }

  batchPointer(): number {
    return 0;
  }

  updateFieldCount(): number {
    return MARKET_UPDATE_FIELD_COUNT;
  }
}
