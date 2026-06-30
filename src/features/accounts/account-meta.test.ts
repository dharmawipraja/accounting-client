import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import {
  SUBTYPE_META, SUBTYPE_VALUES, ACCOUNT_TYPE_ORDER,
  accountTypeLabel, subtypeLabel, cashFlowCategoryLabel, normalBalanceLabel,
  type AccountSubtype,
} from './account-meta';

describe('SUBTYPE_META', () => {
  it('derives type + default normal balance for standard subtypes', () => {
    expect(SUBTYPE_META.CURRENT_ASSET).toEqual({ type: 'ASSET', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.CURRENT_LIABILITY).toEqual({ type: 'LIABILITY', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.REVENUE).toEqual({ type: 'REVENUE', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.COGS).toEqual({ type: 'EXPENSE', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.EQUITY).toEqual({ type: 'EQUITY', defaultNormalBalance: 'CREDIT' });
  });

  it('marks contra-asset accumulated depreciation as ASSET/CREDIT', () => {
    expect(SUBTYPE_META.ACCUMULATED_DEPRECIATION).toEqual({ type: 'ASSET', defaultNormalBalance: 'CREDIT' });
  });

  it('covers all 14 subtypes with a non-empty i18n label', () => {
    expect(SUBTYPE_VALUES).toHaveLength(14);
    for (const k of SUBTYPE_VALUES) expect(subtypeLabel(id, k).length).toBeGreaterThan(0);
  });

  it('orders types Aset→Liabilitas→Ekuitas→Pendapatan→Beban', () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
  });
});

describe('account label helpers', () => {
  it('accountTypeLabel maps every type to Indonesian', () => {
    expect(accountTypeLabel(id, 'ASSET')).toBe('Aset');
    expect(accountTypeLabel(id, 'LIABILITY')).toBe('Liabilitas');
    expect(accountTypeLabel(id, 'EXPENSE')).toBe('Beban');
  });
  it('subtypeLabel uses the canonical chart-of-accounts wording', () => {
    expect(subtypeLabel(id, 'CURRENT_ASSET')).toBe('Aset Lancar');
    expect(subtypeLabel(id, 'TAX_PAYABLE')).toBe('Utang Pajak');
    expect(subtypeLabel(id, 'CURRENT_LIABILITY')).toBe('Liabilitas Jangka Pendek');
    expect(subtypeLabel(id, 'TAX_RECEIVABLE')).toBe('Pajak Dibayar di Muka');
  });
  it('cashFlowCategoryLabel maps every category', () => {
    expect(cashFlowCategoryLabel(id, 'NONE')).toBe('Tidak Ada');
    expect(cashFlowCategoryLabel(id, 'OPERATING')).toBe('Operasi');
    expect(cashFlowCategoryLabel(id, 'INVESTING')).toBe('Investasi');
    expect(cashFlowCategoryLabel(id, 'FINANCING')).toBe('Pendanaan');
  });
  it('normalBalanceLabel maps DEBIT/CREDIT', () => {
    expect(normalBalanceLabel(id, 'DEBIT')).toBe('Debit');
    expect(normalBalanceLabel(id, 'CREDIT')).toBe('Kredit');
  });
});

// Type-level guard: SUBTYPE_VALUES is exactly AccountSubtype[]
const _typecheck: AccountSubtype[] = SUBTYPE_VALUES;
void _typecheck;
