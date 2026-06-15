import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const reportLineSchema = z.object({ code: z.string(), name: z.string(), amount: moneyString });
export type ReportLine = z.infer<typeof reportLineSchema>;

const groupSchema = z.object({ subtype: z.string(), lines: z.array(reportLineSchema), subtotal: moneyString });
const sectionSchema = z.object({ groups: z.array(groupSchema), total: moneyString });

export const balanceSheetReportSchema = z.object({
  asOf: z.string().nullish(),
  assets: sectionSchema,
  liabilities: sectionSchema,
  equity: sectionSchema,
  totalAssets: moneyString,
  totalLiabilities: moneyString,
  totalEquity: moneyString,
  currentYearEarnings: moneyString.nullish(),
  balanced: z.boolean().nullish(),
});
export type BalanceSheetReport = z.infer<typeof balanceSheetReportSchema>;

export const incomeStatementReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: moneyString,
  revenueLines: z.array(reportLineSchema),
  cogs: moneyString,
  cogsLines: z.array(reportLineSchema),
  grossProfit: moneyString,
  operatingExpense: moneyString,
  operatingExpenseLines: z.array(reportLineSchema),
  operatingProfit: moneyString,
  otherIncome: moneyString,
  otherExpense: moneyString,
  profitBeforeTax: moneyString,
  taxExpense: moneyString,
  netIncome: moneyString,
});
export type IncomeStatementReport = z.infer<typeof incomeStatementReportSchema>;

const cashFlowItemSchema = z.object({ name: z.string().nullish(), amount: moneyString.nullish() }).passthrough();
const cashFlowSectionSchema = z.object({
  adjustments: z.array(cashFlowItemSchema).default([]),
  lines: z.array(cashFlowItemSchema).default([]),
  total: moneyString,
});
export const cashFlowReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  netIncome: moneyString,
  operating: cashFlowSectionSchema,
  investing: cashFlowSectionSchema,
  financing: cashFlowSectionSchema,
  netChange: moneyString,
  kasAwal: moneyString,
  kasAkhir: moneyString,
  reconciles: z.boolean().nullish(),
});
export type CashFlowReport = z.infer<typeof cashFlowReportSchema>;
export type CashFlowItem = z.infer<typeof cashFlowItemSchema>;
