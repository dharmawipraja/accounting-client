import { describe, expect, it } from 'vitest';
import { Money } from './money';

describe('Money', () => {
  it('serializes to a 4-decimal API string', () => {
    expect(Money.from('2000000').toApi()).toBe('2000000.0000');
    expect(Money.from('1.5').toApi()).toBe('1.5000');
  });

  it('adds and subtracts without float drift', () => {
    expect(Money.from('0.1').plus(Money.from('0.2')).toApi()).toBe('0.3000');
    expect(Money.from('100').minus(Money.from('33.33')).toApi()).toBe('66.6700');
  });

  it('multiplies quantity by unit price', () => {
    expect(Money.from('150000').times('3').toApi()).toBe('450000.0000');
  });

  it('rounds half up to 4dp (Faktur Pajak rule)', () => {
    expect(Money.from('1.00005').toApi()).toBe('1.0001');
    expect(Money.from('1.00004').toApi()).toBe('1.0000');
  });

  it('formats to rupiah with id-ID grouping and no decimals', () => {
    expect(Money.from('2000000.0000').toRupiah()).toBe('Rp 2.000.000');
  });

  it('compares values', () => {
    expect(Money.from('5').gt(Money.from('4'))).toBe(true);
    expect(Money.from('0').isZero()).toBe(true);
    expect(Money.from('-1').isNegative()).toBe(true);
  });

  it('round-trips an API string', () => {
    const m = Money.from('2000000.0000');
    expect(Money.from(m.toApi()).eq(m)).toBe(true);
  });
});
