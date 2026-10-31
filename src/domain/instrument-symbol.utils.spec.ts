import { instrumentSymbol } from './instrument-symbol.utils';
import { SETTINGS_LIMITS } from './producer-settings.const';

const BASE_LENGTH = 24;

function symbolsInRange(from: number, to: number): string[] {
  return Array.from({ length: to - from }, (_, offset) => instrumentSymbol(from + offset));
}

describe('instrumentSymbol', () => {
  it('uses base names without a suffix for the first cycle', () => {
    expect(instrumentSymbol(0)).toBe('ALPH');
    expect(instrumentSymbol(1)).toBe('BETA');
    expect(instrumentSymbol(BASE_LENGTH - 1)).toBe('OME');
  });

  it('starts the second cycle with share class B', () => {
    expect(instrumentSymbol(BASE_LENGTH)).toBe('ALPH.B');
    expect(instrumentSymbol(BASE_LENGTH + 1)).toBe('BETA.B');
  });

  it('switches to two-letter classes after Z', () => {
    expect(instrumentSymbol(BASE_LENGTH * 25)).toBe('ALPH.Z');
    expect(instrumentSymbol(BASE_LENGTH * 26)).toBe('ALPH.AA');
    expect(instrumentSymbol(BASE_LENGTH * 27)).toBe('ALPH.AB');
  });

  it('is deterministic', () => {
    expect(instrumentSymbol(42)).toBe(instrumentSymbol(42));
  });

  it('produces unique symbols for the allowed instrument count', () => {
    const count = SETTINGS_LIMITS.instrumentCount.max;
    const symbols = Array.from({ length: count }, (_, index) => instrumentSymbol(index));

    expect(new Set(symbols).size).toBe(count);
  });

  it('keeps symbols unique far beyond the current limit', () => {
    const symbols = Array.from({ length: 10_000 }, (_, index) => instrumentSymbol(index));

    expect(new Set(symbols).size).toBe(10_000);
  });

  it('has no duplicates in the base name list', () => {
    const symbols = symbolsInRange(0, BASE_LENGTH);

    expect(new Set(symbols).size).toBe(BASE_LENGTH);
  });

  it('never emits an explicit class A, which would duplicate the bare base name', () => {
    const symbols = symbolsInRange(0, 10_000);

    expect(symbols.filter((symbol) => symbol.endsWith('.A'))).toEqual([]);
  });

  it.each([
    ['first to second cycle', BASE_LENGTH],
    ['class Z to class AA', BASE_LENGTH * 26],
    ['class AZ to class BA', BASE_LENGTH * 52],
  ])('stays unique across the %s boundary', (_, boundary) => {
    const symbols = symbolsInRange(boundary - BASE_LENGTH, boundary + BASE_LENGTH);

    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('uses only upper-case letters and an optional class suffix', () => {
    const symbols = symbolsInRange(0, 2_000);

    expect(symbols.filter((symbol) => !/^[A-Z]+(\.[A-Z]+)?$/.test(symbol))).toEqual([]);
  });

  it('rejects a negative index', () => {
    expect(() => instrumentSymbol(-1)).toThrow();
  });
});
