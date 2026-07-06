import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { textColumn, dateColumn, moneyColumn } from '@/components/common/columnKit';
import { docStatusColumn, paymentStatusColumn, documentActionsColumn } from '@/features/documents/documentColumns';
import type { Messages } from '@/lib/i18n/messages.id';
import type { SalesInvoice } from './schema';

const col = createColumnHelper<SalesInvoice>();

export function buildInvoiceColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (inv: SalesInvoice) => void; onPost: (inv: SalesInvoice) => void; onVoid: (inv: SalesInvoice) => void },
) {
  return [
    textColumn<SalesInvoice>('invoiceRef', t.salesInvoices.number),
    col.accessor('partnerId', { header: t.salesInvoices.partner, cell: (c) => partnerName(c.getValue()) }),
    dateColumn<SalesInvoice>('date', t.salesInvoices.date),
    docStatusColumn<SalesInvoice>('status', t.salesInvoices.status, t),
    paymentStatusColumn<SalesInvoice>('paymentStatus', t.documents.paymentStatus, t),
    moneyColumn<SalesInvoice>('total', t.salesInvoices.total),
    documentActionsColumn<SalesInvoice>({
      renderOpenLink: (inv, label) => (
        <Button asChild variant="ghost" size="sm"><Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{label}</Link></Button>
      ),
      renderDuplicateLink: (inv, label) => (
        <Link to="/sales-invoices/new" search={{ from: inv.id }}>{label}</Link>
      ),
      onPost: handlers.onPost,
      onVoid: handlers.onVoid,
      onDelete: handlers.onDelete,
      labels: { edit: t.common.edit, view: t.salesInvoices.view, delete: t.common.delete, post: t.salesInvoices.post, void: t.salesInvoices.void, duplicate: t.common.duplicate },
    }),
  ];
}
