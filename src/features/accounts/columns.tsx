import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
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
    col.accessor('code', { header: t.accounts.code }),
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
