/** One generated market update: a simulated trade plus the current best bid/ask */
export interface MarketUpdate {
  instrument: number;
  priceCents: number;
  quantity: number;
  bidCents: number;
  askCents: number;
  bidQuantity: number;
  askQuantity: number;
}

// TODO: replace MARKET_UPDATE_FIELD and BATCH_LAYOUT (wasm/assembly/index.ts) with one shared enum
/** Field offsets of an update in the generator batch buffer; mirrors BATCH_LAYOUT in wasm/assembly */
export const MARKET_UPDATE_FIELD = {
  instrument: 0,
  priceCents: 1,
  quantity: 2,
  bidCents: 3,
  askCents: 4,
  bidQuantity: 5,
  askQuantity: 6,
} as const satisfies Record<keyof MarketUpdate, number>;

export const MARKET_UPDATE_FIELD_COUNT = 7;

export function readMarketUpdate(batch: Int32Array, index: number): MarketUpdate {
  const offset = index * MARKET_UPDATE_FIELD_COUNT;

  return {
    instrument: batch[offset + MARKET_UPDATE_FIELD.instrument],
    priceCents: batch[offset + MARKET_UPDATE_FIELD.priceCents],
    quantity: batch[offset + MARKET_UPDATE_FIELD.quantity],
    bidCents: batch[offset + MARKET_UPDATE_FIELD.bidCents],
    askCents: batch[offset + MARKET_UPDATE_FIELD.askCents],
    bidQuantity: batch[offset + MARKET_UPDATE_FIELD.bidQuantity],
    askQuantity: batch[offset + MARKET_UPDATE_FIELD.askQuantity],
  };
}
