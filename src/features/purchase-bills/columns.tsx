import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DocStatusChip, PaymentStatusChip } from '@/components/common/statusChips';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { documentStatusLabel, type DocumentStatus } from '@/features/documents/statusLabel';
import type { PurchaseBill } from './schema';

const col = createColumnHelper<PurchaseBill>();

export function buildBillColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (bill: PurchaseBill) => void; onPost: (bill: PurchaseBill) => void; onVoid: (bill: PurchaseBill) => void },
) {
  return [
    col.accessor('billRef', { header: t.purchaseBills.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.purchaseBills.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.purchaseBills.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('vendorInvoiceNo', { header: t.purchaseBills.vendorInvoiceNo, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('status', { header: t.purchaseBills.status, cell: (c) => <DocStatusChip status={c.getValue()} label={documentStatusLabel(t, c.getValue() as DocumentStatus)} /> }),
    col.accessor('paymentStatus', {
      header: t.documents.paymentStatus,
      cell: (c) => {
        const ps = c.getValue();
        return ps ? <PaymentStatusChip status={ps} t={t} /> : '—';
      },
    }),
    col.accessor('total', { header: t.purchaseBills.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const bill = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {bill.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{t.common.edit}</Link></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(bill)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(bill)}>{t.purchaseBills.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{t.purchaseBills.view}</Link></Button>
                {bill.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(bill)}>{t.purchaseBills.void}</Button>
                  </RoleGate>
                ) : null}
              </>
            )}
          </div>
        );
      },
    }),
  ];
}
