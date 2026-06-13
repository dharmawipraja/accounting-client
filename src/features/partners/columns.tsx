import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RowActions } from '@/components/common/RowActions';
import type { Messages } from '@/lib/i18n/messages.id';
import type { Partner } from './schema';

const col = createColumnHelper<Partner>();

export function buildPartnerColumns(
  t: Messages,
  handlers: { onEdit: (p: Partner) => void; onDeactivate: (p: Partner) => void; onDelete: (p: Partner) => void },
) {
  return [
    col.accessor('code', { header: t.partners.code }),
    col.accessor('name', { header: t.partners.name }),
    col.accessor('npwp', { header: t.partners.npwp, cell: (c) => c.getValue() ?? '—' }),
    col.display({
      id: 'type',
      header: '',
      cell: (c) => (
        <div className="flex gap-1">
          {c.row.original.isCustomer ? <Badge variant="outline">{t.partners.customer}</Badge> : null}
          {c.row.original.isVendor ? <Badge variant="outline">{t.partners.vendor}</Badge> : null}
        </div>
      ),
    }),
    col.accessor('isActive', { header: '', cell: (c) => <StatusBadge active={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowActions
          onEdit={() => handlers.onEdit(c.row.original)}
          onDeactivate={() => handlers.onDeactivate(c.row.original)}
          onDelete={() => handlers.onDelete(c.row.original)}
        />
      ),
    }),
  ];
}
