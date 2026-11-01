import { Xoshiro128Plus } from './xoshiro128-plus';
import { randomLot } from './random-lot.utils';
import { clamp } from './clamp.utils';
import { MarketParams } from './market-params';

/**
 * Batch layout: each update is UPDATE_FIELD_COUNT consecutive i32 values in this order.
 * Keep in sync with the worker side (checked by a test via updateFieldCount()).
 *
 * cell:     0  1      2   3      4      5    6  | 7  8     9  10    11    12   13  | 14 ...
 * field:    I  PRICE  Q   BID    ASK    BQ   AQ | I  PRICE Q  BID   ASK   BQ   AQ  | I  ...
 * value:    2  10200  30  10196  10200  600  400| 0  5005  5  5000  5005  120  80  | 4  ...
 *           └──────── deal 0 ──────────────────┘ └──────── deal 1 ────────────────┘ └───...
 */
const enum BATCH_LAYOUT {
  FIELD_INSTRUMENT = 0,
  FIELD_PRICE_CENTS = 1,
  FIELD_QUANTITY = 2,
  FIELD_BID_CENTS = 3,
  FIELD_ASK_CENTS = 4,
  FIELD_BID_QUANTITY = 5,
  FIELD_ASK_QUANTITY = 6,
  UPDATE_FIELD_COUNT = 7,
}

let batchSize: i32 = 0;
let batch = new StaticArray<i32>(0);

const prng = new Xoshiro128Plus();

// WebAssembly requires initial value
let instrumentCount: i32 = 0;

// Per-instrument state, sized in init()
let midPriceCents = new StaticArray<i32>(0);
let spreadCents = new StaticArray<i32>(0);
let bidQuantity = new StaticArray<i32>(0);
let askQuantity = new StaticArray<i32>(0);

export function init(count: i32, seed: u32, size: i32): void {
  assert(count > 0, 'Instrument count must be positive');
  assert(size > 0, 'Batch size must be positive');

  prng.init(seed);

  batchSize = size;
  batch = new StaticArray<i32>(size * BATCH_LAYOUT.UPDATE_FIELD_COUNT);
  instrumentCount = count;
  midPriceCents = new StaticArray<i32>(count);
  spreadCents = new StaticArray<i32>(count);
  bidQuantity = new StaticArray<i32>(count);
  askQuantity = new StaticArray<i32>(count);

  for (let index = 0; index < count; index++) {
    midPriceCents[index] = prng.nextInt(
      MarketParams.INITIAL_MID_MIN_CENTS,
      MarketParams.INITIAL_MID_MAX_CENTS,
    );
    spreadCents[index] = prng.nextInt(
      MarketParams.MIN_SPREAD_CENTS,
      MarketParams.INITIAL_SPREAD_MAX_CENTS,
    );
    bidQuantity[index] = randomLot(prng.nextF64(), MarketParams.MIN_LOT, MarketParams.MAX_LOT);
    askQuantity[index] = randomLot(prng.nextF64(), MarketParams.MIN_LOT, MarketParams.MAX_LOT);
  }
}

/** Fills the whole batch buffer (`size` from init) and returns how many updates were written */
export function generateBatch(): i32 {
  for (let index = 0; index < batchSize; index++) {
    // pick an instrument
    const instrument = prng.nextInt(0, instrumentCount - 1);

    // move its mid price (random walk, keep it positive)
    const mid = midPriceCents[instrument];
    const step = max<i32>(1, ((mid as f64) * MarketParams.MAX_STEP_RATIO) as i32);
    midPriceCents[instrument] = max<i32>(
      MarketParams.MIN_MID_CENTS,
      mid + prng.nextInt(-step, step),
    );

    const roll = prng.nextInt(0, 9);
    const delta = roll == 0 ? -1 : roll == 9 ? +1 : 0; // 10% narrower, 10% wider, 80% unchanged
    spreadCents[instrument] = clamp(
      spreadCents[instrument] + delta,
      MarketParams.MIN_SPREAD_CENTS,
      MarketParams.MAX_SPREAD_CENTS,
    );

    if (prng.nextF64() < MarketParams.REPLACE_LOT_PROBABILITY) {
      bidQuantity[instrument] = randomLot(
        prng.nextF64(),
        MarketParams.MIN_LOT,
        MarketParams.MAX_LOT,
      );
    } else {
      const quantity = bidQuantity[instrument];
      const step = max<i32>(1, ((quantity as f64) * MarketParams.LOT_DRIFT_RATIO) as i32);
      bidQuantity[instrument] = clamp(
        quantity + prng.nextInt(-step, step),
        MarketParams.MIN_LOT,
        MarketParams.MAX_LOT,
      );
    }

    if (prng.nextF64() < MarketParams.REPLACE_LOT_PROBABILITY) {
      askQuantity[instrument] = randomLot(
        prng.nextF64(),
        MarketParams.MIN_LOT,
        MarketParams.MAX_LOT,
      );
    } else {
      const quantity = askQuantity[instrument];
      const step = max<i32>(1, ((quantity as f64) * MarketParams.LOT_DRIFT_RATIO) as i32);
      askQuantity[instrument] = clamp(
        quantity + prng.nextInt(-step, step),
        MarketParams.MIN_LOT,
        MarketParams.MAX_LOT,
      );
    }

    // derive bid / ask from mid and spread (bid < ask)
    const bid = midPriceCents[instrument] - spreadCents[instrument] / 2;
    const ask = bid + spreadCents[instrument];

    // pick trade side: price = bid or ask; quantity > 0
    const isBuy = prng.nextInt(0, 1) == 1;
    const tradePrice = isBuy ? ask : bid;
    // update book quantities (>= 0)
    const tradeQuantity = randomLot(
      prng.nextF64(),
      MarketParams.MIN_TRADE_QUANTITY,
      MarketParams.MAX_TRADE_QUANTITY,
    );

    writeUpdate(
      index,
      instrument,
      tradePrice,
      tradeQuantity,
      bid,
      ask,
      bidQuantity[instrument],
      askQuantity[instrument],
    );
  }

  return batchSize;
}

export function batchPointer(): usize {
  return changetype<usize>(batch);
}

export function updateFieldCount(): i32 {
  return BATCH_LAYOUT.UPDATE_FIELD_COUNT;
}

// TODO: replace the 8 same-typed parameters with a class (named fields)?
function writeUpdate(
  index: i32,
  instrument: i32,
  priceCents: i32,
  quantity: i32,
  bid: i32,
  ask: i32,
  bidQty: i32,
  askQty: i32,
): void {
  const offset = index * BATCH_LAYOUT.UPDATE_FIELD_COUNT;

  unchecked((batch[offset + BATCH_LAYOUT.FIELD_INSTRUMENT] = instrument));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_PRICE_CENTS] = priceCents));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_QUANTITY] = quantity));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_BID_CENTS] = bid));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_ASK_CENTS] = ask));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_BID_QUANTITY] = bidQty));
  unchecked((batch[offset + BATCH_LAYOUT.FIELD_ASK_QUANTITY] = askQty));
}
