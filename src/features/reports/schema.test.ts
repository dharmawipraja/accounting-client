import { describe, expect, it } from 'vitest';
import { balanceSheetReportSchema, incomeStatementReportSchema, cashFlowReportSchema, trialBalanceSchema, generalLedgerSchema, agingReportSchema } from './schema';

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

describe('trial balance + general ledger schemas', () => {
  it('trial balance parses rows + grand totals', () => {
    const r = trialBalanceSchema.parse({
      asOf: '2026-06-30',
      rows: [
        { accountId: 'a1', code: '1-1000', name: 'Kas', debit: '500000.0000', credit: '0.0000', balance: '500000.0000' },
        { accountId: 'a2', code: '3-1000', name: 'Modal', debit: '0.0000', credit: '500000.0000', balance: '-500000.0000' },
      ],
      totalDebit: '500000.0000', totalCredit: '500000.0000',
    });
    expect(r.rows[0].name).toBe('Kas');
    expect(r.totalDebit).toBe('500000.0000');
  });

  it('general ledger parses account + lines + opening/closing', () => {
    const r = generalLedgerSchema.parse({
      account: { id: 'a1', code: '1-1000', name: 'Kas', normalBalance: 'DEBIT' },
      from: '2026-01-01', to: '2026-06-30',
      openingBalance: '0.0000',
      lines: [{ date: '2026-03-01', entryRef: 'JE/2026/000004', description: 'Setoran modal', debit: '1000000.0000', credit: '0.0000', runningBalance: '1000000.0000' }],
      closingBalance: '1000000.0000',
    });
    expect(r.account.code).toBe('1-1000');
    expect(r.lines[0].entryRef).toBe('JE/2026/000004');
    expect(r.closingBalance).toBe('1000000.0000');
  });
});

describe('aging report schema', () => {
  it('parses partners with buckets + documents, totals, and grand total', () => {
    const r = agingReportSchema.parse({
      kind: 'AR', asOf: '2026-06-30',
      partners: [{
        partnerId: 'p1', partnerName: 'PT Pelanggan',
        documents: [{ ref: 'INV/2026/000012', date: '2026-04-01', dueDate: '2026-05-01', total: '1000000.0000', paidAsOf: '0.0000', outstanding: '1000000.0000', bucket: '31-60' }],
        buckets: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
      }],
      totalsByBucket: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
      totalOutstanding: '1000000.0000',
    });
    expect(r.partners[0].partnerName).toBe('PT Pelanggan');
    expect(r.partners[0].buckets['31-60']).toBe('1000000.0000');
    expect(r.partners[0].documents[0].ref).toBe('INV/2026/000012');
    expect(r.totalOutstanding).toBe('1000000.0000');
  });
});
