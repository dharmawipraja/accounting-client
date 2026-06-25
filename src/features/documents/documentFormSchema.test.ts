import { expect, it, describe } from 'vitest';
import { documentLineFormSchema, documentHeaderSchema, EMPTY_LINE, safeAmount } from './documentFormSchema';

describe('documentLineFormSchema', () => {
  it('accepts a valid line', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: 'a1', quantity: '2', unitPrice: '1000', taxCodeIds: [] }).success).toBe(true);
  });
  it('rejects zero quantity', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: 'a1', quantity: '0', unitPrice: '1000', taxCodeIds: [] }).success).toBe(false);
  });
  it('rejects a missing account', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: '', quantity: '1', unitPrice: '1000', taxCodeIds: [] }).success).toBe(false);
  });
});

describe('documentHeaderSchema', () => {
  it('requires partner, date, and at least one line', () => {
    const r = documentHeaderSchema.safeParse({ partnerId: '', date: '', dueDate: '', description: '', lines: [] });
    expect(r.success).toBe(false);
  });
  it('accepts a valid header', () => {
    const r = documentHeaderSchema.safeParse({ partnerId: 'p1', date: '2026-06-25', dueDate: '', description: '', lines: [{ ...EMPTY_LINE, accountId: 'a1', unitPrice: '1000' }] });
    expect(r.success).toBe(true);
  });
});

describe('safeAmount', () => {
  it('multiplies as decimal strings', () => {
    expect(safeAmount('2', '500000')).toBe('1000000.0000');
  });
  it('returns 0 on garbage input', () => {
    expect(safeAmount('abc', 'x')).toBe('0');
  });
});
