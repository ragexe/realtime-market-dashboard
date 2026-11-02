import { MarketUpdateField } from './market-update-field';

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

/** Offsets from the shared MarketUpdateField enum, keyed by MarketUpdate fields */
export const MARKET_UPDATE_FIELD = {
  instrument: MarketUpdateField.Instrument,
  priceCents: MarketUpdateField.PriceCents,
  quantity: MarketUpdateField.Quantity,
  bidCents: MarketUpdateField.BidCents,
  askCents: MarketUpdateField.AskCents,
  bidQuantity: MarketUpdateField.BidQuantity,
  askQuantity: MarketUpdateField.AskQuantity,
} as const satisfies Record<keyof MarketUpdate, MarketUpdateField>;

export const MARKET_UPDATE_FIELD_COUNT = MarketUpdateField.Count;

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
