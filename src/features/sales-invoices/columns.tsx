import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { SalesInvoice } from './schema';

const col = createColumnHelper<SalesInvoice>();

function statusLabel(t: Messages, status: string): string {
  if (status === 'DRAFT') return t.salesInvoices.statusDraft;
  if (status === 'POSTED') return t.salesInvoices.statusPosted;
  return t.salesInvoices.statusVoid;
}

export function buildInvoiceColumns(
  t: Messages,
  partnerName: (id: string) => string,
  onDelete: (inv: SalesInvoice) => void,
) {
  return [
    col.accessor('invoiceNumber', { header: t.salesInvoices.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.salesInvoices.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.salesInvoices.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('status', {
      header: t.salesInvoices.status,
      cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge>,
    }),
    col.accessor('total', { header: t.salesInvoices.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      // 3a: draft Edit + Delete (ACCOUNTANT+). Post/Void row actions are added in Plan 3b.
      cell: (c) =>
        c.row.original.status === 'DRAFT' ? (
          <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
            <div className="flex justify-end gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link to="/sales-invoices/$id/edit" params={{ id: c.row.original.id }}>{t.common.edit}</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(c.row.original)}>
                {t.common.delete}
              </Button>
            </div>
          </RoleGate>
        ) : null,
    }),
  ];
}
