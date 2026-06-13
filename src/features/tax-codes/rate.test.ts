import { describe, expect, it } from 'vitest';
import { fractionToPercent, formatRatePercent, percentToFraction } from './rate';

describe('rate helpers', () => {
  it('percentToFraction divides by 100 without float drift', () => {
    expect(percentToFraction('11')).toBe('0.11');
    expect(percentToFraction('2.5')).toBe('0.025');
    expect(percentToFraction('0')).toBe('0');
    expect(percentToFraction('')).toBe('0');
  });
  it('fractionToPercent multiplies by 100 and trims', () => {
    expect(fractionToPercent('0.02')).toBe('2');
    expect(fractionToPercent('0.110000')).toBe('11');
    expect(fractionToPercent('0.025')).toBe('2.5');
    expect(fractionToPercent('')).toBe('0');
  });
  it('formatRatePercent appends a percent sign', () => {
    expect(formatRatePercent('0.02')).toBe('2%');
    expect(formatRatePercent('0.11')).toBe('11%');
  });
});
