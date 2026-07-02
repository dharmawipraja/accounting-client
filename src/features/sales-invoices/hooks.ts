import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
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

export const usePostInvoice = () => salesInvoicesApi.useAction('post');
export const useVoidInvoice = () => salesInvoicesApi.useAction('void');
