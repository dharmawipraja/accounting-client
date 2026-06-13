import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const balanceSheetSchema = z.object({
  asOf: z.string().nullish(),
  totalAssets: moneyString,
  totalLiabilities: moneyString,
  totalEquity: moneyString,
  currentYearEarnings: moneyString.nullish(),
  balanced: z.boolean().nullish(),
});
export type BalanceSheet = z.infer<typeof balanceSheetSchema>;

export const incomeStatementSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: moneyString,
  netIncome: moneyString,
});
export type IncomeStatement = z.infer<typeof incomeStatementSchema>;

export const cashFlowSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  netChange: moneyString,
  kasAwal: moneyString.nullish(),
  kasAkhir: moneyString,
});
export type CashFlow = z.infer<typeof cashFlowSchema>;

export const draftCountSchema = z.object({ total: z.number() });
export type DraftCount = z.infer<typeof draftCountSchema>;
