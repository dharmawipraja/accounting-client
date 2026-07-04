import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JournalStatusChip } from '@/components/common/statusChips';
import { textColumn, dateColumn, moneyColumn } from '@/components/common/columnKit';
import { RoleGate } from '@/components/common/RoleGate';
import type { Messages } from '@/lib/i18n/messages.id';
import { journalSourceLabel } from './sourceLabel';
import type { JournalEntryListItem } from './schema';

const col = createColumnHelper<JournalEntryListItem>();

export function buildJournalColumns(
  t: Messages,
  handlers: { onDelete: (e: JournalEntryListItem) => void; onPost: (e: JournalEntryListItem) => void; onReverse: (e: JournalEntryListItem) => void },
) {
  return [
    textColumn<JournalEntryListItem>('entryRef', t.journals.entryRef),
    dateColumn<JournalEntryListItem>('date', t.journals.date),
    col.accessor('description', { header: t.journals.description, cell: (c) => c.getValue() }),
    col.accessor('sourceType', { header: t.journals.sourceType, cell: (c) => <Badge variant="outline">{journalSourceLabel(t, c.getValue())}</Badge> }),
    col.accessor('status', { header: t.journals.status, cell: (c) => <JournalStatusChip status={c.getValue()} t={t} /> }),
    moneyColumn<JournalEntryListItem>('totalDebit', t.journals.totalDebit),
    col.accessor('lineCount', { header: t.journals.lineCount, cell: (c) => c.getValue() }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const e = c.row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button asChild variant="ghost" size="sm"><Link to="/journals/$id" params={{ id: e.id }}>{t.journals.view}</Link></Button>
            {e.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(e)}>{t.common.delete}</Button>
                </RoleGate>
                {/* Post commits the entry to the ledger — distinct outline weight vs the ghost View/Delete. */}
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="outline" size="sm" onClick={() => handlers.onPost(e)}>{t.journals.post}</Button>
                </RoleGate>
              </>
            ) : e.status === 'POSTED' && e.sourceType === 'MANUAL' ? (
              <RoleGate allow={['APPROVER', 'ADMIN']}>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handlers.onReverse(e)}>{t.journals.reverse}</Button>
              </RoleGate>
            ) : null}
          </div>
        );
      },
    }),
  ];
}
