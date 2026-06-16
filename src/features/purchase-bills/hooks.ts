import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import {
  purchaseBillSchema,
  type PurchaseBill,
  type PurchaseBillCreatePayload,
  type PurchaseBillUpdatePayload,
} from './schema';

export const purchaseBillsApi = createResourceHooks<
  PurchaseBill,
  PurchaseBillCreatePayload,
  PurchaseBillUpdatePayload
>({
  key: 'purchaseBills',
  basePath: '/purchase-bills',
  itemSchema: purchaseBillSchema,
  paginated: true,
});

export const usePostBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'post' });
export const useVoidBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'void' });
