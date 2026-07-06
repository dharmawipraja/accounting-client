import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { activeStatusColumn, masterActionsColumn } from '@/components/common/columnKit';
import type { Messages } from '@/lib/i18n/messages.id';
import { subtypeLabel, normalBalanceLabel } from './account-meta';
import type { Account } from './schema';

const col = createColumnHelper<Account>();

export function buildAccountColumns(
  t: Messages,
  handlers: { onEdit: (a: Account) => void; onToggleActive: (a: Account) => void; onDelete: (a: Account) => void },
) {
  return [
    col.accessor('code', {
      header: t.accounts.code,
      // Drill-down: the account code links to its ledger (balance + GL movement).
      cell: (c) => (
        <Button asChild variant="link" className="h-auto p-0 font-normal">
          <Link to="/accounts/$id" params={{ id: c.row.original.id }}>{c.getValue()}</Link>
        </Button>
      ),
    }),
    col.accessor('name', { header: t.accounts.name }),
    col.accessor('subtype', {
      header: t.accounts.subtype,
      cell: (c) => subtypeLabel(t, c.getValue()),
    }),
    col.accessor('normalBalance', {
      header: t.accounts.normalBalance,
      cell: (c) => <Badge variant="outline">{normalBalanceLabel(t, c.getValue())}</Badge>,
    }),
    activeStatusColumn<Account>(t.crud.status),
    masterActionsColumn<Account>(handlers),
  ];
}
