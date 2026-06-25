import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';
import {
  salesInvoiceSchema,
  type SalesInvoice,
  type SalesInvoiceCreatePayload,
  type SalesInvoiceUpdatePayload,
} from './schema';

export const salesInvoicesApi = createDocumentHooks<
  SalesInvoice,
  SalesInvoiceCreatePayload,
  SalesInvoiceUpdatePayload
>({
  keys: queryKeys.salesInvoices,
  basePath: '/sales-invoices',
  itemSchema: salesInvoiceSchema,
  paginated: true,
});

export const usePostInvoice = () => useDocumentAction({ keys: queryKeys.salesInvoices, basePath: '/sales-invoices', action: 'post' });
export const useVoidInvoice = () => useDocumentAction({ keys: queryKeys.salesInvoices, basePath: '/sales-invoices', action: 'void' });
