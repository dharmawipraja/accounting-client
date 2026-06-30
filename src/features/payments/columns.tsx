import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DocStatusChip, DirectionChip } from '@/components/common/statusChips';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { documentStatusLabel, type DocumentStatus } from '@/features/documents/statusLabel';
import type { Payment } from './schema';

const col = createColumnHelper<Payment>();

/** Payment total = sum of allocation amounts (decimal). */
export function paymentTotal(p: Payment): string {
  return p.allocations.reduce((acc, a) => acc.plus(Money.from(a.amount)), Money.zero()).toApi();
}

export function buildPaymentColumns(
  t: Messages,
  partnerName: (id: string) => string,
  accountName: (id: string) => string,
  handlers: { onDelete: (p: Payment) => void; onPost: (p: Payment) => void; onVoid: (p: Payment) => void },
) {
  return [
    col.accessor('ref', { header: t.payments.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('direction', { header: t.payments.direction, cell: (c) => <DirectionChip direction={c.getValue()} t={t} /> }),
    col.accessor('partnerId', { header: t.payments.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.payments.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('cashAccountId', { header: t.payments.cashAccount, cell: (c) => accountName(c.getValue()) }),
    col.display({ id: 'total', header: t.payments.amount, cell: (c) => <MoneyText value={paymentTotal(c.row.original)} /> }),
    col.accessor('status', { header: t.payments.status, cell: (c) => <DocStatusChip status={c.getValue()} label={documentStatusLabel(t, c.getValue() as DocumentStatus)} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const p = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {p.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm"><Link to="/payments/$id/edit" params={{ id: p.id }}>{t.common.edit}</Link></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(p)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(p)}>{t.payments.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/payments/$id/edit" params={{ id: p.id }}>{t.payments.view}</Link></Button>
                {p.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(p)}>{t.payments.void}</Button>
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
