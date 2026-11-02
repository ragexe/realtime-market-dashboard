/**
 * Field offsets of one update in the generator batch buffer; `Count` is the number of fields per update.
 * Compiled by both TypeScript and AssemblyScript (wasm/assembly), so it stays a plain enum
 * of integer literals with no imports (enforced in eslint.config.js).
 *
 * cell:     0  1      2   3      4      5    6  | 7  8     9  10    11    12   13  | 14 ...
 * field:    I  PRICE  Q   BID    ASK    BQ   AQ | I  PRICE Q  BID   ASK   BQ   AQ  | I  ...
 * value:    2  10200  30  10196  10200  600  400| 0  5005  5  5000  5005  120  80  | 4  ...
 *           └──────── deal 0 ──────────────────┘ └──────── deal 1 ────────────────┘ └───...
 */
export enum MarketUpdateField {
  Instrument = 0,
  PriceCents = 1,
  Quantity = 2,
  BidCents = 3,
  AskCents = 4,
  BidQuantity = 5,
  AskQuantity = 6,
  Count = 7,
}
