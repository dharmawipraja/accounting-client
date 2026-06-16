import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import {
  salesInvoiceSchema,
  type SalesInvoice,
  type SalesInvoiceCreatePayload,
  type SalesInvoiceUpdatePayload,
} from './schema';

export const salesInvoicesApi = createResourceHooks<
  SalesInvoice,
  SalesInvoiceCreatePayload,
  SalesInvoiceUpdatePayload
>({
  key: 'salesInvoices',
  basePath: '/sales-invoices',
  itemSchema: salesInvoiceSchema,
  paginated: true,
});

export const usePostInvoice = () => useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'post' });
export const useVoidInvoice = () => useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'void' });
