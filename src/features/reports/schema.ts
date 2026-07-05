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

export const trialBalanceRowSchema = z.object({
  accountId: z.string(),
  code: z.string(),
  name: z.string(),
  debit: moneyString,
  credit: moneyString,
  balance: moneyString,
});
export type TrialBalanceRow = z.infer<typeof trialBalanceRowSchema>;

export const trialBalanceSchema = z.object({
  asOf: z.string().nullish(),
  rows: z.array(trialBalanceRowSchema),
  totalDebit: moneyString,
  totalCredit: moneyString,
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

export const generalLedgerLineSchema = z.object({
  date: z.string(),
  entryRef: z.string().nullish(), // nullable in the spec (GeneralLedgerLineDto)
  description: z.string().nullish(),
  debit: moneyString,
  credit: moneyString,
  runningBalance: moneyString,
});
export type GeneralLedgerLine = z.infer<typeof generalLedgerLineSchema>;

export const generalLedgerSchema = z.object({
  account: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    normalBalance: z.string(),
  }),
  from: z.string().nullish(),
  to: z.string().nullish(),
  openingBalance: moneyString,
  lines: z.array(generalLedgerLineSchema),
  closingBalance: moneyString,
});
export type GeneralLedger = z.infer<typeof generalLedgerSchema>;

export const agingDocumentSchema = z.object({
  ref: z.string().nullish(), // nullable in the spec (AgingDocumentDto)
  date: z.string(),
  dueDate: z.string().nullish(),
  total: moneyString,
  paidAsOf: moneyString.nullish(),
  outstanding: moneyString,
  bucket: z.string(),
});
export type AgingDocument = z.infer<typeof agingDocumentSchema>;

const agingBucketsSchema = z.record(z.string(), moneyString);

export const agingPartnerSchema = z.object({
  partnerId: z.string(),
  partnerName: z.string(),
  documents: z.array(agingDocumentSchema).default([]),
  buckets: agingBucketsSchema,
});
export type AgingPartner = z.infer<typeof agingPartnerSchema>;

export const agingReportSchema = z.object({
  kind: z.string().nullish(),
  asOf: z.string().nullish(),
  partners: z.array(agingPartnerSchema),
  totalsByBucket: agingBucketsSchema,
  totalOutstanding: moneyString,
});
export type AgingReport = z.infer<typeof agingReportSchema>;

export const AGING_BUCKETS = ['Current', '1-30', '31-60', '61-90', '>90'] as const;
