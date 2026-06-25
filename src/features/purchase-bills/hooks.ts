import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
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

export const usePostBill = () => useDocumentAction({ keys: queryKeys.purchaseBills, basePath: '/purchase-bills', action: 'post' });
export const useVoidBill = () => useDocumentAction({ keys: queryKeys.purchaseBills, basePath: '/purchase-bills', action: 'void' });
