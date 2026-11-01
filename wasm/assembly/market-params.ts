/* eslint-disable @typescript-eslint/no-namespace -- AssemblyScript specific */
/** Parameters of the simulated market; all values are inlined by the compiler */
export namespace MarketParams {
  /** Max mid price move per update as a share of the price (0.05%); tunes volatility */
  export const MAX_STEP_RATIO: f64 = 0.05e-2;

  /** Floor for the mid price random walk; keeps bid positive, must exceed MAX_SPREAD_CENTS / 2 */
  export const MIN_MID_CENTS: i32 = 100;

  /** Narrowest spread; at least 1 cent keeps bid strictly below ask */
  export const MIN_SPREAD_CENTS: i32 = 1;

  /** Widest spread; keeps the spread realistic for a liquid instrument */
  export const MAX_SPREAD_CENTS: i32 = 10;

  /** Lowest starting mid price ($10.00); must not be below MIN_MID_CENTS */
  export const INITIAL_MID_MIN_CENTS: i32 = 10_00;

  /** Highest starting mid price ($500.00) */
  export const INITIAL_MID_MAX_CENTS: i32 = 500_00;

  /** Widest starting spread; the narrowest is MIN_SPREAD_CENTS. Must not exceed MAX_SPREAD_CENTS */
  export const INITIAL_SPREAD_MAX_CENTS: i32 = 3;

  /** Smallest book quantity at the best level; must be >= 0 (book quantities are nonnegative) */
  export const MIN_LOT: i32 = 100;

  /** Largest book quantity at the best level; rare thanks to the cubic skew in randomLot */
  export const MAX_LOT: i32 = 10_000;

  /** Max book quantity drift per update as a share of the current lot (10%) */
  export const LOT_DRIFT_RATIO: f64 = 10e-2;

  /** Smallest trade quantity; at least 1 keeps trade quantities positive */
  export const MIN_TRADE_QUANTITY: i32 = 1;

  /** Largest trade quantity; trades are usually smaller than resting book lots */
  export const MAX_TRADE_QUANTITY: i32 = 500;

  /** Chance (5%) per update that a book level is replaced by a fresh lot (order placed or cancelled) */
  export const REPLACE_LOT_PROBABILITY: f64 = 5e-2;
}

// Runs once when the module is instantiated: an inconsistent model fails fast via env.abort
assert(MarketParams.MIN_SPREAD_CENTS >= 1, 'MIN_SPREAD_CENTS must keep bid below ask');

assert(
  MarketParams.MAX_SPREAD_CENTS >= MarketParams.MIN_SPREAD_CENTS,
  'MAX_SPREAD_CENTS must not be below MIN_SPREAD_CENTS',
);

assert(
  MarketParams.MIN_MID_CENTS > MarketParams.MAX_SPREAD_CENTS / 2,
  'MIN_MID_CENTS must exceed MAX_SPREAD_CENTS / 2',
);

assert(
  MarketParams.INITIAL_MID_MIN_CENTS >= MarketParams.MIN_MID_CENTS,
  'Initial mid price must not start below the floor',
);

assert(
  MarketParams.INITIAL_MID_MAX_CENTS >= MarketParams.INITIAL_MID_MIN_CENTS,
  'Initial mid range must not be inverted',
);

assert(
  MarketParams.INITIAL_SPREAD_MAX_CENTS >= MarketParams.MIN_SPREAD_CENTS &&
    MarketParams.INITIAL_SPREAD_MAX_CENTS <= MarketParams.MAX_SPREAD_CENTS,
  'INITIAL_SPREAD_MAX_CENTS must be within [MIN_SPREAD_CENTS, MAX_SPREAD_CENTS]',
);

assert(MarketParams.MIN_LOT >= 0, 'MIN_LOT must keep book quantities nonnegative');
assert(MarketParams.MAX_LOT >= MarketParams.MIN_LOT, 'MAX_LOT must not be below MIN_LOT');

assert(
  MarketParams.REPLACE_LOT_PROBABILITY >= 0 && MarketParams.REPLACE_LOT_PROBABILITY <= 1,
  'REPLACE_LOT_PROBABILITY must be within [0, 1]',
);

assert(MarketParams.LOT_DRIFT_RATIO >= 0, 'LOT_DRIFT_RATIO must not be negative');

assert(
  MarketParams.MIN_TRADE_QUANTITY >= 1,
  'MIN_TRADE_QUANTITY must keep trade quantities positive',
);

assert(
  MarketParams.MAX_TRADE_QUANTITY >= MarketParams.MIN_TRADE_QUANTITY,
  'MAX_TRADE_QUANTITY must not be below MIN_TRADE_QUANTITY',
);
