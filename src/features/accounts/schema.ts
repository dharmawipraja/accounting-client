import { z } from 'zod';

export const accountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
export const normalBalanceSchema = z.enum(['DEBIT', 'CREDIT']);
export const cashFlowCategorySchema = z.enum(['OPERATING', 'INVESTING', 'FINANCING', 'NONE']);
export const accountSubtypeSchema = z.enum([
  'EQUITY', 'REVENUE', 'CURRENT_ASSET', 'NON_CURRENT_ASSET', 'FIXED_ASSET',
  'ACCUMULATED_DEPRECIATION', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY',
  'COGS', 'OPERATING_EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE', 'TAX_PAYABLE', 'TAX_RECEIVABLE',
]);

export type AccountType = z.infer<typeof accountTypeSchema>;
export type NormalBalance = z.infer<typeof normalBalanceSchema>;
export type CashFlowCategory = z.infer<typeof cashFlowCategorySchema>;
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>;

// Item shape — hand-authored; reconciled against the live API in Plan 2b's first task.
// Default zod strips unknown keys, so extra server fields are tolerated.
export const accountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  subtype: accountSubtypeSchema,
  normalBalance: normalBalanceSchema,
  cashFlowCategory: cashFlowCategorySchema.nullish(),
  isPostable: z.boolean(),
  isActive: z.boolean(),
  parentId: z.string().nullish(),
});
export type Account = z.infer<typeof accountSchema>;

// Create form (subtype-driven; type+normalBalance derived but still submitted).
export const accountCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  subtype: accountSubtypeSchema,
  type: accountTypeSchema,
  normalBalance: normalBalanceSchema,
  cashFlowCategory: cashFlowCategorySchema,
  isPostable: z.boolean(),
  parentCode: z.string().optional(),
});
export type AccountCreateValues = z.infer<typeof accountCreateSchema>;

// Edit form (UpdateAccountDto: name, cashFlowCategory, isActive only).
export const accountEditSchema = z.object({
  name: z.string().min(1),
  cashFlowCategory: cashFlowCategorySchema,
  isActive: z.boolean(),
});
export type AccountEditValues = z.infer<typeof accountEditSchema>;

export type AccountCreatePayload = AccountCreateValues;
export type AccountUpdatePayload = AccountEditValues;
