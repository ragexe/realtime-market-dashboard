import type { InstrumentSnapshot } from './instrument-snapshot.model';
import { MARKET_UPDATE_FIELD, MARKET_UPDATE_FIELD_COUNT } from './market-update.model';

/**
 * Impure: mutates `instruments` in place, applying the first `count` updates of the batch.
 * Latest update wins for last price and book; volume and notional add up every trade.
 */
export function applyBatchInPlace(
  instruments: InstrumentSnapshot[],
  batch: Int32Array,
  count: number,
): void {
  // TODO: Add mechanism of syncing batch size
  const payloadSize = Math.min(count * MARKET_UPDATE_FIELD_COUNT, batch.length);

  for (let index = 0; index < payloadSize; index = index + MARKET_UPDATE_FIELD_COUNT) {
    const incomingInstrumentIndex = batch[index + MARKET_UPDATE_FIELD.instrument];
    const incomingPriceCents = batch[index + MARKET_UPDATE_FIELD.priceCents];
    const incomingQuantity = batch[index + MARKET_UPDATE_FIELD.quantity];
    const incomingBidCents = batch[index + MARKET_UPDATE_FIELD.bidCents];
    const incomingAskCents = batch[index + MARKET_UPDATE_FIELD.askCents];
    const incomingBidQuantity = batch[index + MARKET_UPDATE_FIELD.bidQuantity];
    const incomingAskQuantity = batch[index + MARKET_UPDATE_FIELD.askQuantity];

    const instrument = instruments[incomingInstrumentIndex];

    instrument.lastPriceCents = incomingPriceCents;
    instrument.volume = instrument.volume + incomingQuantity;
    instrument.notionalCents = instrument.notionalCents + incomingPriceCents * incomingQuantity;

    instrument.bidCents = incomingBidCents;
    instrument.askCents = incomingAskCents;
    instrument.bidQuantity = incomingBidQuantity;
    instrument.askQuantity = incomingAskQuantity;
  }
}
