import { describe, expect, it } from 'vitest';
import { SUBTYPE_META, ACCOUNT_TYPE_ORDER, type AccountSubtype } from './account-meta';

describe('SUBTYPE_META', () => {
  it('derives type + default normal balance for standard subtypes', () => {
    expect(SUBTYPE_META.CURRENT_ASSET).toMatchObject({ type: 'ASSET', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.CURRENT_LIABILITY).toMatchObject({ type: 'LIABILITY', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.REVENUE).toMatchObject({ type: 'REVENUE', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.COGS).toMatchObject({ type: 'EXPENSE', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.EQUITY).toMatchObject({ type: 'EQUITY', defaultNormalBalance: 'CREDIT' });
  });

  it('marks contra-asset accumulated depreciation as ASSET/CREDIT', () => {
    expect(SUBTYPE_META.ACCUMULATED_DEPRECIATION).toMatchObject({ type: 'ASSET', defaultNormalBalance: 'CREDIT' });
  });

  it('covers all 14 subtypes with a non-empty label', () => {
    const keys = Object.keys(SUBTYPE_META) as AccountSubtype[];
    expect(keys).toHaveLength(14);
    for (const k of keys) expect(SUBTYPE_META[k].label.length).toBeGreaterThan(0);
  });

  it('orders types Aset→Liabilitas→Ekuitas→Pendapatan→Beban', () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
  });
});
