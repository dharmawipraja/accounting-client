import { describe, expect, it } from 'vitest';
import { purchaseBillSchema, billFormSchema } from './schema';

const sample = {
  id: 'b1', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-77', partnerId: 'v1',
  date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: 'x', status: 'DRAFT',
  subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000',
  total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID',
  lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'a1', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }],
};

describe('purchaseBillSchema', () => {
  it('parses the reconciled draft shape and strips extras', () => {
    const r = purchaseBillSchema.parse({ ...sample, fiscalYear: null, createdBy: 'u' });
    expect(r.status).toBe('DRAFT');
    expect(r.vendorInvoiceNo).toBe('VINV-77');
    expect(r.lines[0].purchaseBillId).toBe('b1');
    expect(r.billRef).toBeNull();
  });
  it('parses a POSTED bill (billNumber + billRef + fiscalYear)', () => {
    const r = purchaseBillSchema.parse({ ...sample, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, journalEntryId: 'j1' });
    expect(r.status).toBe('POSTED');
    expect(r.billNumber).toBe(1);
    expect(r.billRef).toBe('BILL/2026/000001');
  });

  it('parses a list item that omits lines (list responses omit them)', () => {
    const listItem: Record<string, unknown> = { ...sample, fiscalYear: null, createdBy: 'u' };
    delete listItem.lines;
    const r = purchaseBillSchema.parse(listItem);
    expect(r.lines).toEqual([]);
  });
});

describe('billFormSchema', () => {
  it('requires partner, date, and at least one line', () => {
    expect(billFormSchema.safeParse({ partnerId: '', date: '', dueDate: '', vendorInvoiceNo: '', description: '', lines: [] }).success).toBe(false);
  });
  it('accepts a valid form', () => {
    const ok = billFormSchema.safeParse({
      partnerId: 'v1', date: '2026-06-15', dueDate: '', vendorInvoiceNo: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '1', unitPrice: '1000000', taxCodeIds: ['t1'] }],
    });
    expect(ok.success).toBe(true);
  });
  it('rejects a line with zero quantity', () => {
    const bad = billFormSchema.safeParse({
      partnerId: 'v1', date: '2026-06-15', dueDate: '', vendorInvoiceNo: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '0', unitPrice: '5', taxCodeIds: [] }],
    });
    expect(bad.success).toBe(false);
  });
});
