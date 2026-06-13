import Decimal from 'decimal.js';

/** Percent string (e.g. "11") -> fraction string (e.g. "0.11"). Empty -> "0". */
export function percentToFraction(percent: string): string {
  if (!percent.trim()) return '0';
  return new Decimal(percent).div(100).toString();
}

/** Fraction string (e.g. "0.02") -> percent string (e.g. "2"). Empty -> "0". */
export function fractionToPercent(fraction: string): string {
  if (!fraction.trim()) return '0';
  return new Decimal(fraction).mul(100).toString();
}

/** Fraction string -> display percent (e.g. "0.02" -> "2%"). */
export function formatRatePercent(fraction: string): string {
  return `${fractionToPercent(fraction)}%`;
}
