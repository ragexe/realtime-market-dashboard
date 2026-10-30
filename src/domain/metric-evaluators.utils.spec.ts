import { imbalance, spreadCents, vwapCents } from './metric-evaluators.utils';

describe('Metric Evaluators Utils: spreadCents', () => {
  it('returns ask minus bid (task example: $102.00 - $101.96)', () => {
    expect(spreadCents({ bidCents: 10196, askCents: 10200 })).toBe(4);
  });

  it('returns null when bid is unavailable', () => {
    expect(spreadCents({ bidCents: null, askCents: 10200 })).toBeNull();
  });

  it('returns null when ask is unavailable', () => {
    expect(spreadCents({ bidCents: 10196, askCents: null })).toBeNull();
  });
});

describe('Metric Evaluators Utils: vwapCents', () => {
  it('weights prices by quantity (task example: 10 @ $100, 30 @ $102)', () => {
    const notionalCents = 10 * 10000 + 30 * 10200;

    expect(vwapCents({ notionalCents, volume: 40 })).toBe(10150);
  });

  it('returns null when volume is zero', () => {
    expect(vwapCents({ notionalCents: 0, volume: 0 })).toBeNull();
  });

  it('keeps fractional cents without rounding', () => {
    expect(vwapCents({ notionalCents: 10001, volume: 3 })).toBeCloseTo(3333.6667, 4);
  });
});

describe('Metric Evaluators Utils: imbalance', () => {
  it('returns relative book imbalance (task example: 600 bid vs 400 ask)', () => {
    expect(imbalance({ bidQuantity: 600, askQuantity: 400 })).toBeCloseTo(0.2, 10);
  });

  it('returns -1 when only the ask side has quantity', () => {
    expect(imbalance({ bidQuantity: 0, askQuantity: 400 })).toBe(-1);
  });

  it('returns +1 when only the bid side has quantity', () => {
    expect(imbalance({ bidQuantity: 600, askQuantity: 0 })).toBe(1);
  });

  it('returns null when both sides are empty', () => {
    expect(imbalance({ bidQuantity: 0, askQuantity: 0 })).toBeNull();
  });

  it('returns null when a side is unavailable', () => {
    expect(imbalance({ bidQuantity: null, askQuantity: 400 })).toBeNull();
    expect(imbalance({ bidQuantity: 600, askQuantity: null })).toBeNull();
  });
});
