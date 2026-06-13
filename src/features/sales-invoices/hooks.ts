import { createResourceHooks } from '@/lib/crud/createResourceHooks';
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
});
