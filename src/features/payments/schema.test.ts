import { describe, expect, it } from 'vitest';
import { paymentSchema } from './schema';

const draft = {
  id: 'pay1', number: null, ref: null, fiscalYear: null, direction: 'RECEIPT', partnerId: 'p1',
  date: '2026-06-16T00:00:00.000Z', cashAccountId: 'kas', description: 'Terima', status: 'DRAFT',
  amount: '1110000.0000', journalEntryId: null,
  allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }],
};

describe('paymentSchema', () => {
  it('parses a draft payment and strips extra keys', () => {
    const r = paymentSchema.parse({ ...draft, createdBy: 'u', updatedAt: 'x' });
    expect(r.direction).toBe('RECEIPT');
    expect(r.allocations[0].salesInvoiceId).toBe('i1');
  });
  it('tolerates a posted payment with a numeric number + ref + fiscalYear', () => {
    const r = paymentSchema.parse({ ...draft, status: 'POSTED', number: 1, ref: 'PAY-RCV/2026/000001', fiscalYear: 2026 });
    expect(r.status).toBe('POSTED');
    expect(r.number).toBe(1);
    expect(r.ref).toBe('PAY-RCV/2026/000001');
  });

  it('parses a list item that omits allocations (list responses omit them)', () => {
    const listItem: Record<string, unknown> = { ...draft };
    delete listItem.allocations;
    const r = paymentSchema.parse(listItem);
    expect(r.allocations).toEqual([]);
  });
});
