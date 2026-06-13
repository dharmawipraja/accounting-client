import { createResourceKeys } from '@/lib/crud/createResourceHooks';

export const queryKeys = {
  me: ['auth', 'me'] as const,
  accounts: createResourceKeys('accounts'),
  partners: createResourceKeys('partners'),
  taxCodes: createResourceKeys('taxCodes'),
  salesInvoices: createResourceKeys('salesInvoices'),
  payments: createResourceKeys('payments'),
  reports: {
    all: ['reports'] as const,
    balanceSheet: (asOf: string) => ['reports', 'balance-sheet', asOf] as const,
    incomeStatement: (from: string, to: string) => ['reports', 'income-statement', from, to] as const,
    cashFlow: (from: string, to: string) => ['reports', 'cash-flow', from, to] as const,
    draftCount: () => ['reports', 'draft-count'] as const,
  },
};
