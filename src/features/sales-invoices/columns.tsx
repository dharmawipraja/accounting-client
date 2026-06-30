import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DocStatusChip, PaymentStatusChip } from '@/components/common/statusChips';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { documentStatusLabel, type DocumentStatus } from '@/features/documents/statusLabel';
import type { SalesInvoice } from './schema';

const col = createColumnHelper<SalesInvoice>();

export function buildInvoiceColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (inv: SalesInvoice) => void; onPost: (inv: SalesInvoice) => void; onVoid: (inv: SalesInvoice) => void },
) {
  return [
    col.accessor('invoiceRef', { header: t.salesInvoices.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.salesInvoices.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.salesInvoices.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('status', {
      header: t.salesInvoices.status,
      cell: (c) => <DocStatusChip status={c.getValue()} label={documentStatusLabel(t, c.getValue() as DocumentStatus)} />,
    }),
    col.accessor('paymentStatus', {
      header: t.documents.paymentStatus,
      cell: (c) => {
        const ps = c.getValue();
        return ps ? <PaymentStatusChip status={ps} t={t} /> : '—';
      },
    }),
    col.accessor('total', { header: t.salesInvoices.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const inv = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {inv.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{t.common.edit}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(inv)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(inv)}>{t.salesInvoices.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{t.salesInvoices.view}</Link>
                </Button>
                {inv.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(inv)}>{t.salesInvoices.void}</Button>
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
