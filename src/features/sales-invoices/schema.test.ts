import { describe, expect, it } from 'vitest';
import { salesInvoiceSchema, invoiceFormSchema } from './schema';

const sample = {
  id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z',
  dueDate: '2026-07-13T00:00:00.000Z', description: 'x', status: 'DRAFT',
  subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000',
  total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID',
  lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'a1', quantity: '2.0000', unitPrice: '500000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }],
};

describe('salesInvoiceSchema', () => {
  it('parses the reconciled shape and strips extras', () => {
    const r = salesInvoiceSchema.parse({ ...sample, fiscalYear: null, createdBy: 'u', journalEntryId: null });
    expect(r.status).toBe('DRAFT');
    expect(r.lines[0].amount).toBe('1000000.0000');
    expect(r.invoiceNumber).toBeNull();
  });

  it('parses a POSTED invoice (numeric invoiceNumber + invoiceRef)', () => {
    const r = salesInvoiceSchema.parse({ ...sample, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' });
    expect(r.status).toBe('POSTED');
    expect(r.invoiceNumber).toBe(1);
    expect(r.invoiceRef).toBe('INV/2026/000001');
  });
});

describe('invoiceFormSchema', () => {
  it('requires partner, date, and at least one line', () => {
    expect(invoiceFormSchema.safeParse({ partnerId: '', date: '', dueDate: '', description: '', lines: [] }).success).toBe(false);
  });
  it('accepts a valid form', () => {
    const ok = invoiceFormSchema.safeParse({
      partnerId: 'p1', date: '2026-06-13', dueDate: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '2', unitPrice: '500000', taxCodeIds: ['t1'] }],
    });
    expect(ok.success).toBe(true);
  });
  it('rejects a line with zero quantity', () => {
    const bad = invoiceFormSchema.safeParse({
      partnerId: 'p1', date: '2026-06-13', dueDate: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '0', unitPrice: '5', taxCodeIds: [] }],
    });
    expect(bad.success).toBe(false);
  });
});
