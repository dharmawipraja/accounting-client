import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import {
  purchaseBillSchema,
  type PurchaseBill,
  type PurchaseBillCreatePayload,
  type PurchaseBillUpdatePayload,
} from './schema';

export const purchaseBillsApi = createDocumentHooks<
  PurchaseBill,
  PurchaseBillCreatePayload,
  PurchaseBillUpdatePayload
>({
  keys: queryKeys.purchaseBills,
  basePath: '/purchase-bills',
  itemSchema: purchaseBillSchema,
  paginated: true,
});

// Posting/voiding writes a journal entry — keep the journals list fresh too.
export const usePostBill = () => purchaseBillsApi.useAction('post', [queryKeys.journalEntries.all]);
export const useVoidBill = () => purchaseBillsApi.useAction('void', [queryKeys.journalEntries.all]);
