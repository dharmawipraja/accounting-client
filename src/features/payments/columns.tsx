import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DirectionChip } from '@/components/common/statusChips';
import { textColumn, dateColumn, moneyDisplayColumn } from '@/components/common/columnKit';
import { docStatusColumn, documentActionsColumn } from '@/features/documents/documentColumns';
import { Money } from '@/lib/money/money';
import type { Messages } from '@/lib/i18n/messages.id';
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
    textColumn<Payment>('ref', t.payments.number),
    col.accessor('direction', { header: t.payments.direction, cell: (c) => <DirectionChip direction={c.getValue()} t={t} /> }),
    col.accessor('partnerId', { header: t.payments.partner, cell: (c) => partnerName(c.getValue()) }),
    dateColumn<Payment>('date', t.payments.date),
    col.accessor('cashAccountId', { header: t.payments.cashAccount, cell: (c) => accountName(c.getValue()) }),
    moneyDisplayColumn<Payment>('total', t.payments.amount, paymentTotal),
    docStatusColumn<Payment>('status', t.payments.status, t),
    documentActionsColumn<Payment>({
      renderOpenLink: (p, label) => (
        <Button asChild variant="ghost" size="sm"><Link to="/payments/$id/edit" params={{ id: p.id }}>{label}</Link></Button>
      ),
      onPost: handlers.onPost,
      onVoid: handlers.onVoid,
      onDelete: handlers.onDelete,
      labels: { edit: t.common.edit, view: t.payments.view, delete: t.common.delete, post: t.payments.post, void: t.payments.void },
    }),
  ];
}
