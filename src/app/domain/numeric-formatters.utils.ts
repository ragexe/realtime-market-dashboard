const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const signedRatio = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

export const NOT_AVAILABLE = '—';

export function formatPriceCents(cents: number | null): string {
  return cents === null ? NOT_AVAILABLE : usd.format(cents / 100);
}

export function formatQuantity(quantity: number): string {
  return integer.format(quantity);
}

export function formatSignedRatio(ratio: number | null): string {
  return ratio === null ? NOT_AVAILABLE : signedRatio.format(ratio);
}
