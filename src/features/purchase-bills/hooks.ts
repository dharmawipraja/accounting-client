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

export const usePostBill = () => purchaseBillsApi.useAction('post');
export const useVoidBill = () => purchaseBillsApi.useAction('void');
