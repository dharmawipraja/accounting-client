import { describe, expect, it } from 'vitest';
import { balanceSheetReportSchema, incomeStatementReportSchema, cashFlowReportSchema } from './schema';

describe('report schemas', () => {
  it('balance sheet parses sections → subtype groups → lines + totals', () => {
    const r = balanceSheetReportSchema.parse({
      asOf: '2026-06-30',
      assets: { groups: [{ subtype: 'CURRENT_ASSET', lines: [{ code: '1-1000', name: 'Kas', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
      liabilities: { groups: [], total: '0.0000' },
      equity: { groups: [{ subtype: 'CURRENT_EARNINGS', lines: [{ code: '', name: 'Laba Berjalan', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
      totalAssets: '500000.0000', totalLiabilities: '0.0000', totalEquity: '500000.0000', currentYearEarnings: '500000.0000', balanced: true,
    });
    expect(r.assets.groups[0].lines[0].name).toBe('Kas');
    expect(r.totalAssets).toBe('500000.0000');
  });

  it('income statement parses line sections + computed subtotals', () => {
    const r = incomeStatementReportSchema.parse({
      from: '2026-01-01', to: '2026-06-30',
      revenue: '2000000.0000', revenueLines: [{ code: '4-1000', name: 'Pendapatan', amount: '2000000.0000' }],
      cogs: '0.0000', cogsLines: [], grossProfit: '2000000.0000',
      operatingExpense: '0.0000', operatingExpenseLines: [], operatingProfit: '2000000.0000',
      otherIncome: '0.0000', otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '0.0000', netIncome: '1750000.0000',
    });
    expect(r.netIncome).toBe('1750000.0000');
    expect(r.revenueLines[0].name).toBe('Pendapatan');
  });

  it('cash flow parses sections (empty adjustments/lines default []) + totals', () => {
    const r = cashFlowReportSchema.parse({
      from: '2026-01-01', to: '2026-06-30', netIncome: '0.0000',
      operating: { adjustments: [], total: '0.0000' }, investing: { lines: [], total: '0.0000' }, financing: { lines: [], total: '0.0000' },
      netChange: '750000.0000', kasAwal: '250000.0000', kasAkhir: '1000000.0000', reconciles: true,
    });
    expect(r.kasAkhir).toBe('1000000.0000');
    expect(r.operating.adjustments).toEqual([]);
  });
});
