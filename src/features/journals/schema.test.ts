import { describe, expect, it } from 'vitest';
import { journalEntryListItemSchema, journalEntrySchema, journalEntriesPageSchema } from './schema';

describe('journal schemas', () => {
  it('list item parses the lightweight projection (totalDebit + lineCount, no lines)', () => {
    const r = journalEntryListItemSchema.parse({
      id: 'je1', entryRef: 'JE/2026/000002', entryNumber: 2, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z',
      description: 'x', status: 'POSTED', sourceType: 'SALE', sourceId: 'inv1', totalDebit: '1110000.0000', lineCount: 2,
    });
    expect(r.totalDebit).toBe('1110000.0000');
    expect(r.lineCount).toBe(2);
    expect('lines' in r).toBe(false);
  });

  it('detail parses with lines (debit/credit integer-form strings) and defaults missing lines to []', () => {
    const withLines = journalEntrySchema.parse({
      id: 'je1', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null,
      description: 'x', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null,
      lines: [{ id: 'l1', journalEntryId: 'je1', lineNo: 1, accountId: 'a1', debit: '100000', credit: '0', description: 'd' }],
    });
    expect(withLines.lines[0].debit).toBe('100000');
    const noLines = journalEntrySchema.parse({ id: 'je9', date: '2026-06-16T00:00:00.000Z', description: 'x', sourceType: 'MANUAL', status: 'DRAFT' });
    expect(noLines.lines).toEqual([]);
  });

  it('page schema parses the envelope', () => {
    const r = journalEntriesPageSchema.parse({ data: [], total: 3, limit: 20, offset: 0 });
    expect(r.total).toBe(3);
  });
});
