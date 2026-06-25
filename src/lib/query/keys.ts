import { createResourceKeys } from '@/lib/crud/createResourceHooks';

export const queryKeys = {
  accounts: createResourceKeys('accounts'),
  partners: createResourceKeys('partners'),
  taxCodes: createResourceKeys('taxCodes'),
  salesInvoices: createResourceKeys('salesInvoices'),
  payments: createResourceKeys('payments'),
  purchaseBills: createResourceKeys('purchaseBills'),
  journalEntries: createResourceKeys('journalEntries'),
  reports: {
    all: ['reports'] as const,
    balanceSheet: (asOf: string) => ['reports', 'balance-sheet', asOf] as const,
    incomeStatement: (from: string, to: string) => ['reports', 'income-statement', from, to] as const,
    cashFlow: (from: string, to: string) => ['reports', 'cash-flow', from, to] as const,
    draftCount: () => ['reports', 'draft-count'] as const,
  },
  periods: {
    all: ['periods'] as const,
    list: (fiscalYear: number) => ['periods', 'list', fiscalYear] as const,
  },
  yearEnd: {
    all: ['year-end'] as const,
    status: (fiscalYear: number) => ['year-end', 'status', fiscalYear] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (filters: unknown) => ['audit', 'list', filters] as const,
  },
  companySettings: ['company-settings'] as const,
  taxCalc: (args: string) => ['taxCalc', args] as const,
  report: (path: string, params: unknown) => ['report', path, params] as const,
};
