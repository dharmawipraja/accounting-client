import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RowActions } from '@/components/common/RowActions';
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
    col.accessor('isActive', {
      header: t.crud.status,
      cell: (c) => <StatusBadge active={c.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowActions
          onEdit={() => handlers.onEdit(c.row.original)}
          active={c.row.original.isActive}
          onToggleActive={() => handlers.onToggleActive(c.row.original)}
          onDelete={() => handlers.onDelete(c.row.original)}
        />
      ),
    }),
  ];
}
