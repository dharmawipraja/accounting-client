import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { textColumn, dateColumn, moneyColumn } from '@/components/common/columnKit';
import { docStatusColumn, paymentStatusColumn, documentActionsColumn } from '@/features/documents/documentColumns';
import type { Messages } from '@/lib/i18n/messages.id';
import type { PurchaseBill } from './schema';

const col = createColumnHelper<PurchaseBill>();

export function buildBillColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (bill: PurchaseBill) => void; onPost: (bill: PurchaseBill) => void; onVoid: (bill: PurchaseBill) => void },
) {
  return [
    textColumn<PurchaseBill>('billRef', t.purchaseBills.number),
    col.accessor('partnerId', { header: t.purchaseBills.partner, cell: (c) => partnerName(c.getValue()) }),
    dateColumn<PurchaseBill>('date', t.purchaseBills.date),
    textColumn<PurchaseBill>('vendorInvoiceNo', t.purchaseBills.vendorInvoiceNo),
    docStatusColumn<PurchaseBill>('status', t.purchaseBills.status, t),
    paymentStatusColumn<PurchaseBill>('paymentStatus', t.documents.paymentStatus, t),
    moneyColumn<PurchaseBill>('total', t.purchaseBills.total),
    documentActionsColumn<PurchaseBill>({
      renderOpenLink: (bill, label) => (
        <Button asChild variant="ghost" size="sm"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{label}</Link></Button>
      ),
      renderDuplicateLink: (bill, label) => (
        <Link to="/purchase-bills/new" search={{ from: bill.id }}>{label}</Link>
      ),
      onPost: handlers.onPost,
      onVoid: handlers.onVoid,
      onDelete: handlers.onDelete,
      labels: { edit: t.common.edit, view: t.purchaseBills.view, delete: t.common.delete, post: t.purchaseBills.post, void: t.purchaseBills.void, duplicate: t.common.duplicate },
    }),
  ];
}
