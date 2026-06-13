import { createResourceKeys } from '@/lib/crud/createResourceHooks';

export const queryKeys = {
  me: ['auth', 'me'] as const,
  accounts: createResourceKeys('accounts'),
  partners: createResourceKeys('partners'),
  taxCodes: createResourceKeys('taxCodes'),
  salesInvoices: createResourceKeys('salesInvoices'),
};
