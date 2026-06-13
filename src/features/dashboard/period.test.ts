import { describe, expect, it } from 'vitest';
import { computePeriod, periodValid } from './period';

// Local-time 13 Jun 2026 (month is 0-indexed). toApiDate uses local getters.
const today = new Date(2026, 5, 13);

describe('computePeriod', () => {
  it('year -> 1 Jan to today', () => {
    expect(computePeriod('year', today)).toEqual({ preset: 'year', from: '2026-01-01', to: '2026-06-13' });
  });
  it('quarter -> 1 Apr to today (Q2)', () => {
    expect(computePeriod('quarter', today)).toEqual({ preset: 'quarter', from: '2026-04-01', to: '2026-06-13' });
  });
  it('month -> 1 Jun to today', () => {
    expect(computePeriod('month', today)).toEqual({ preset: 'month', from: '2026-06-01', to: '2026-06-13' });
  });
});

describe('periodValid', () => {
  it('true when from <= to', () => {
    expect(periodValid({ preset: 'custom', from: '2026-01-01', to: '2026-06-13' })).toBe(true);
  });
  it('false when from > to', () => {
    expect(periodValid({ preset: 'custom', from: '2026-07-01', to: '2026-06-13' })).toBe(false);
  });
  it('false when a bound is empty', () => {
    expect(periodValid({ preset: 'custom', from: '', to: '2026-06-13' })).toBe(false);
  });
});
