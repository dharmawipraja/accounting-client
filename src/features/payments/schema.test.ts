import { describe, expect, it } from 'vitest';
import { paymentSchema } from './schema';

const draft = {
  id: 'pay1', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1',
  date: '2026-06-16T00:00:00.000Z', cashAccountId: 'kas', description: 'Terima', status: 'DRAFT',
  total: '1110000.0000', journalEntryId: null,
  allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }],
};

describe('paymentSchema', () => {
  it('parses a draft payment and strips extra keys', () => {
    const r = paymentSchema.parse({ ...draft, createdBy: 'u', updatedAt: 'x' });
    expect(r.direction).toBe('RECEIPT');
    expect(r.allocations[0].salesInvoiceId).toBe('i1');
  });
  it('tolerates a posted payment with a numeric paymentNumber + ref', () => {
    const r = paymentSchema.parse({ ...draft, status: 'POSTED', paymentNumber: 1, paymentRef: 'PAY/2026/000001' });
    expect(r.status).toBe('POSTED');
    expect(r.paymentNumber).toBe(1);
  });
});
