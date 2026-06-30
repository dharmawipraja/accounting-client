import type { Messages } from '@/lib/i18n/messages.id';
import type { AccountType, NormalBalance, CashFlowCategory, AccountSubtype } from './schema';

export type { AccountType, NormalBalance, CashFlowCategory, AccountSubtype } from './schema';

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

/** Derivation only — subtype drives the account's type and default normal balance.
 *  Labels live in i18n (`accounts.subtypeLabels`), reached via `subtypeLabel`. */
export const SUBTYPE_META: Record<AccountSubtype, { type: AccountType; defaultNormalBalance: NormalBalance }> = {
  CURRENT_ASSET:            { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  NON_CURRENT_ASSET:        { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  FIXED_ASSET:              { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  ACCUMULATED_DEPRECIATION: { type: 'ASSET',     defaultNormalBalance: 'CREDIT' },
  TAX_RECEIVABLE:           { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  CURRENT_LIABILITY:        { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  NON_CURRENT_LIABILITY:    { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  TAX_PAYABLE:              { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  EQUITY:                   { type: 'EQUITY',    defaultNormalBalance: 'CREDIT' },
  REVENUE:                  { type: 'REVENUE',   defaultNormalBalance: 'CREDIT' },
  OTHER_INCOME:             { type: 'REVENUE',   defaultNormalBalance: 'CREDIT' },
  COGS:                     { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
  OPERATING_EXPENSE:        { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
  OTHER_EXPENSE:            { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
};

/** Subtype select order (preserves the historical SUBTYPE_META key order). */
export const SUBTYPE_VALUES = Object.keys(SUBTYPE_META) as AccountSubtype[];

const TYPE_LABEL_KEY: Record<AccountType, 'typeAset' | 'typeLiabilitas' | 'typeEkuitas' | 'typePendapatan' | 'typeBeban'> = {
  ASSET: 'typeAset', LIABILITY: 'typeLiabilitas', EQUITY: 'typeEkuitas', REVENUE: 'typePendapatan', EXPENSE: 'typeBeban',
};

export function accountTypeLabel(t: Messages, type: AccountType): string {
  return t.accounts[TYPE_LABEL_KEY[type]];
}
export function subtypeLabel(t: Messages, subtype: AccountSubtype): string {
  return t.accounts.subtypeLabels[subtype];
}
export function cashFlowCategoryLabel(t: Messages, cat: CashFlowCategory): string {
  return t.accounts.cashFlowLabels[cat];
}
export function normalBalanceLabel(t: Messages, nb: NormalBalance): string {
  return nb === 'DEBIT' ? t.accounts.debit : t.accounts.credit;
}
