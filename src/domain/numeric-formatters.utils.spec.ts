import {
  formatPriceCents,
  formatQuantity,
  formatSignedRatio,
  NOT_AVAILABLE,
} from './numeric-formatters.utils';

describe('Numeric formatters: formatPriceCents', () => {
  it('formats integer cents as USD with two decimals', () => {
    expect(formatPriceCents(10200)).toBe('$102.00');
    expect(formatPriceCents(10150)).toBe('$101.50');
  });

  it('formats sub-dollar amounts', () => {
    expect(formatPriceCents(4)).toBe('$0.04');
    expect(formatPriceCents(0)).toBe('$0.00');
  });

  it('groups thousands', () => {
    expect(formatPriceCents(5233320)).toBe('$52,333.20');
  });

  it('rounds fractional cents only at display time', () => {
    expect(formatPriceCents(10150.333)).toBe('$101.50');
    expect(formatPriceCents(10150.6)).toBe('$101.51');
  });

  it('shows unavailable value for null', () => {
    expect(formatPriceCents(null)).toBe(NOT_AVAILABLE);
  });
});

describe('Numeric formatters: formatQuantity', () => {
  it('formats zero volume as 0', () => {
    expect(formatQuantity(0)).toBe('0');
  });

  it('groups thousands', () => {
    expect(formatQuantity(1234567)).toBe('1,234,567');
  });
});

describe('Numeric formatters: formatSignedRatio', () => {
  it('shows explicit sign for positive and negative values', () => {
    expect(formatSignedRatio(0.2)).toBe('+0.20');
    expect(formatSignedRatio(-0.35)).toBe('-0.35');
  });

  it('shows zero without sign, including negative zero', () => {
    expect(formatSignedRatio(0)).toBe('0.00');
    expect(formatSignedRatio(-0)).toBe('0.00');
  });

  it('formats the bounds of the imbalance range', () => {
    expect(formatSignedRatio(1)).toBe('+1.00');
    expect(formatSignedRatio(-1)).toBe('-1.00');
  });

  it('shows unavailable value for null', () => {
    expect(formatSignedRatio(null)).toBe(NOT_AVAILABLE);
  });
});
