import { describe, expect, it } from 'vitest';
import { periodSchema, yearEndStatusSchema, isPeriodClosed, isYearClosed, monthLabel } from './schema';

describe('period schema + helpers', () => {
  it('parses a period; derives open + month label', () => {
    const p = periodSchema.parse({ id: 'p1', fiscalYear: 2026, month: 1, status: 'OPEN', startDate: '2026-01-01', endDate: '2026-01-31', closedAt: null });
    expect(p.fiscalYear).toBe(2026);
    expect(isPeriodClosed(p)).toBe(false);
    expect(monthLabel(p)).toBe('Januari');
  });
  it('treats status CLOSED or isClosed true as closed', () => {
    expect(isPeriodClosed(periodSchema.parse({ id: 'p', fiscalYear: 2026, month: 3, status: 'CLOSED' }))).toBe(true);
    expect(isPeriodClosed(periodSchema.parse({ id: 'p', fiscalYear: 2026, month: 3, isClosed: true }))).toBe(true);
  });
  it('parses year-end status; isYearClosed handles null + closed', () => {
    expect(isYearClosed(null)).toBe(false);
    expect(isYearClosed(yearEndStatusSchema.parse({ fiscalYear: 2026, status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' }))).toBe(true);
  });
});
