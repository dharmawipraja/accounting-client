import { createResourceKeys } from '@/lib/crud/createResourceHooks';

export const queryKeys = {
  accounts: createResourceKeys('accounts'),
  partners: createResourceKeys('partners'),
  taxCodes: createResourceKeys('taxCodes'),
  salesInvoices: createResourceKeys('salesInvoices'),
  payments: createResourceKeys('payments'),
  purchaseBills: createResourceKeys('purchaseBills'),
  journalEntries: createResourceKeys('journalEntries'),
  /** Dashboard's draft-journal count. The three financial statements the dashboard
   *  shows are cached under `report(path, params)` via the reports feature's useReport. */
  draftCount: () => ['dashboard', 'draft-count'] as const,
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
