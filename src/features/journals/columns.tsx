import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JournalStatusChip } from '@/components/common/statusChips';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { JournalEntryListItem } from './schema';

const col = createColumnHelper<JournalEntryListItem>();

function sourceLabel(t: Messages, s: string): string {
  if (s === 'MANUAL') return t.journals.sourceManual;
  if (s === 'REVERSAL') return t.journals.sourceReversal;
  if (s === 'SALE') return t.journals.sourceSale;
  if (s === 'PURCHASE') return t.journals.sourcePurchase;
  if (s === 'PAYMENT') return t.journals.sourcePayment;
  return s;
}

export function buildJournalColumns(
  t: Messages,
  handlers: { onDelete: (e: JournalEntryListItem) => void; onPost: (e: JournalEntryListItem) => void; onReverse: (e: JournalEntryListItem) => void },
) {
  return [
    col.accessor('entryRef', { header: t.journals.entryRef, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('date', { header: t.journals.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('description', { header: t.journals.description, cell: (c) => c.getValue() }),
    col.accessor('sourceType', { header: t.journals.sourceType, cell: (c) => <Badge variant="outline">{sourceLabel(t, c.getValue())}</Badge> }),
    col.accessor('status', { header: t.journals.status, cell: (c) => <JournalStatusChip status={c.getValue()} t={t} /> }),
    col.accessor('totalDebit', { header: t.journals.totalDebit, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.accessor('lineCount', { header: t.journals.lineCount, cell: (c) => c.getValue() }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const e = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="sm"><Link to="/journals/$id" params={{ id: e.id }}>{t.journals.view}</Link></Button>
            {e.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(e)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(e)}>{t.journals.post}</Button>
                </RoleGate>
              </>
            ) : e.status === 'POSTED' && e.sourceType === 'MANUAL' ? (
              <RoleGate allow={['APPROVER', 'ADMIN']}>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onReverse(e)}>{t.journals.reverse}</Button>
              </RoleGate>
            ) : null}
          </div>
        );
      },
    }),
  ];
}
