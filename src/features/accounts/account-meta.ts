export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type AccountSubtype =
  | 'EQUITY' | 'REVENUE' | 'CURRENT_ASSET' | 'NON_CURRENT_ASSET' | 'FIXED_ASSET'
  | 'ACCUMULATED_DEPRECIATION' | 'CURRENT_LIABILITY' | 'NON_CURRENT_LIABILITY'
  | 'COGS' | 'OPERATING_EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE'
  | 'TAX_PAYABLE' | 'TAX_RECEIVABLE';
export type CashFlowCategory = 'OPERATING' | 'INVESTING' | 'FINANCING' | 'NONE';

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

export const SUBTYPE_META: Record<
  AccountSubtype,
  { type: AccountType; defaultNormalBalance: NormalBalance; label: string }
> = {
  CURRENT_ASSET:            { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Lancar' },
  NON_CURRENT_ASSET:        { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Tidak Lancar' },
  FIXED_ASSET:              { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Tetap' },
  ACCUMULATED_DEPRECIATION: { type: 'ASSET',     defaultNormalBalance: 'CREDIT', label: 'Akumulasi Penyusutan' },
  TAX_RECEIVABLE:           { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Pajak Dibayar di Muka' },
  CURRENT_LIABILITY:        { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Liabilitas Jangka Pendek' },
  NON_CURRENT_LIABILITY:    { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Liabilitas Jangka Panjang' },
  TAX_PAYABLE:              { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Utang Pajak' },
  EQUITY:                   { type: 'EQUITY',    defaultNormalBalance: 'CREDIT', label: 'Ekuitas' },
  REVENUE:                  { type: 'REVENUE',   defaultNormalBalance: 'CREDIT', label: 'Pendapatan' },
  OTHER_INCOME:             { type: 'REVENUE',   defaultNormalBalance: 'CREDIT', label: 'Pendapatan Lain-lain' },
  COGS:                     { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Harga Pokok Penjualan' },
  OPERATING_EXPENSE:        { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Beban Operasional' },
  OTHER_EXPENSE:            { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Beban Lain-lain' },
};

export const SUBTYPE_OPTIONS = (Object.keys(SUBTYPE_META) as AccountSubtype[]).map((value) => ({
  value,
  label: SUBTYPE_META[value].label,
}));
