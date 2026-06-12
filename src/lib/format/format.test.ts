import { describe, expect, it } from 'vitest';
import { formatDateID, toApiDate, isRangeValid } from './date';
import { formatInt } from './number';

describe('date format', () => {
  it('formats an API date as dd/mm/yyyy', () => {
    expect(formatDateID('2026-06-12')).toBe('12/06/2026');
  });
  it('produces a YYYY-MM-DD api date from a Date', () => {
    expect(toApiDate(new Date(2026, 5, 12))).toBe('2026-06-12');
  });
  it('validates that from <= to', () => {
    expect(isRangeValid('2026-01-01', '2026-12-31')).toBe(true);
    expect(isRangeValid('2026-12-31', '2026-01-01')).toBe(false);
  });
});

describe('number format', () => {
  it('groups integers with id-ID separators', () => {
    expect(formatInt(2000000)).toBe('2.000.000');
  });
});
