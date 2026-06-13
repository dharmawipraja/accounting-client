import { describe, expect, it } from 'vitest';
import { balanceSheetSchema, cashFlowSchema, draftCountSchema, incomeStatementSchema } from './schema';

describe('dashboard report schemas', () => {
  it('balanceSheet keeps totals and strips nested detail', () => {
    const r = balanceSheetSchema.parse({
      asOf: '2026-06-13',
      assets: { groups: [], total: '0.0000' },
      liabilities: { groups: [], total: '0.0000' },
      equity: { groups: [], total: '0.0000' },
      totalAssets: '1500000.0000',
      totalLiabilities: '600000.0000',
      totalEquity: '900000.0000',
      currentYearEarnings: '0.0000',
      balanced: true,
    });
    expect(r.totalAssets).toBe('1500000.0000');
    expect('assets' in r).toBe(false);
  });

  it('incomeStatement keeps revenue + netIncome (incl. negative)', () => {
    const r = incomeStatementSchema.parse({
      from: '2026-01-01', to: '2026-06-13', revenue: '2000000.0000', cogs: '0.0000', netIncome: '-50000.0000',
    });
    expect(r.revenue).toBe('2000000.0000');
    expect(r.netIncome).toBe('-50000.0000');
  });

  it('cashFlow keeps netChange + kasAkhir', () => {
    const r = cashFlowSchema.parse({
      from: '2026-01-01', to: '2026-06-13', netIncome: '0.0000', netChange: '750000.0000',
      kasAwal: '250000.0000', kasAkhir: '1234000.0000', reconciles: true,
    });
    expect(r.kasAkhir).toBe('1234000.0000');
  });

  it('draftCount reads the envelope total', () => {
    const r = draftCountSchema.parse({ data: [], total: 3, limit: 1, offset: 0 });
    expect(r.total).toBe(3);
  });
});
