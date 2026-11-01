import { FormControl } from '@angular/forms';

import { integerValidator } from './numeric-validators.utils';

describe('numericValidatorsUtils: integerValidator', () => {
  function validate(value: unknown) {
    return integerValidator(new FormControl(value));
  }

  it.each([null, ''])('leaves an empty value (%j) to the required validator', (value) => {
    expect(validate(value)).toBeNull();
  });

  it.each([0, 1, 50, -3, 10_000])('accepts the integer %d', (value) => {
    expect(validate(value)).toBeNull();
  });

  it.each([1.5, 0.1, -2.25])('rejects the fraction %d', (value) => {
    expect(validate(value)).toEqual({ integer: true });
  });

  it.each([NaN, Infinity, -Infinity])('rejects %d', (value) => {
    expect(validate(value)).toEqual({ integer: true });
  });

  it('rejects a numeric string: number inputs give numbers, not text', () => {
    expect(validate('5')).toEqual({ integer: true });
  });
});
