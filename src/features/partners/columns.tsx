import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { textColumn, activeStatusColumn, masterActionsColumn } from '@/components/common/columnKit';
import type { Messages } from '@/lib/i18n/messages.id';
import type { Partner } from './schema';

const col = createColumnHelper<Partner>();

export function buildPartnerColumns(
  t: Messages,
  handlers: { onEdit: (p: Partner) => void; onToggleActive: (p: Partner) => void; onDelete: (p: Partner) => void },
) {
  return [
    col.accessor('code', {
      header: t.partners.code,
      // Drill-down: the partner code links to its statement (position + documents).
      cell: (c) => (
        <Button asChild variant="link" className="h-auto p-0 font-normal">
          <Link to="/partners/$id" params={{ id: c.row.original.id }}>{c.getValue()}</Link>
        </Button>
      ),
    }),
    col.accessor('name', { header: t.partners.name }),
    textColumn<Partner>('npwp', t.partners.npwp),
    col.display({
      id: 'type',
      header: t.partners.type,
      cell: (c) => (
        <div className="flex gap-1">
          {c.row.original.isCustomer ? <Badge variant="outline">{t.partners.customer}</Badge> : null}
          {c.row.original.isVendor ? <Badge variant="outline">{t.partners.vendor}</Badge> : null}
        </div>
      ),
    }),
    activeStatusColumn<Partner>(t.crud.status),
    masterActionsColumn<Partner>(handlers),
  ];
}
