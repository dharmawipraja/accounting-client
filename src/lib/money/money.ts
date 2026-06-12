import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export class Money {
  private readonly d: Decimal;
  private constructor(d: Decimal) {
    this.d = d;
  }

  static from(v: string | number | Money): Money {
    if (v instanceof Money) return new Money(v.d);
    return new Money(new Decimal(v));
  }
  static zero(): Money {
    return new Money(new Decimal(0));
  }

  plus(o: Money): Money {
    return new Money(this.d.plus(o.d));
  }
  minus(o: Money): Money {
    return new Money(this.d.minus(o.d));
  }
  times(o: Money | string | number): Money {
    const factor = o instanceof Money ? o.d : new Decimal(o);
    return new Money(this.d.times(factor));
  }
  eq(o: Money): boolean {
    return this.d.eq(o.d);
  }
  gt(o: Money): boolean {
    return this.d.gt(o.d);
  }
  lt(o: Money): boolean {
    return this.d.lt(o.d);
  }
  isZero(): boolean {
    return this.d.isZero();
  }
  isNegative(): boolean {
    return this.d.isNegative();
  }

  toApi(): string {
    return this.d.toFixed(4, Decimal.ROUND_HALF_UP);
  }
  toRupiah(): string {
    // Intl.NumberFormat('id-ID') emits U+00A0 (non-breaking space) between
    // the currency symbol and the number. Normalize it to a plain ASCII space
    // so callers can assert 'Rp 2.000.000' with a regular space.
    return rupiahFmt.format(this.d.toNumber()).replace(/\u00A0/g, ' ');
  }
  toString(): string {
    return this.toApi();
  }
}
