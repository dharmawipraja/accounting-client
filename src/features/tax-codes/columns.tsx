import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { activeStatusColumn, masterActionsColumn } from '@/components/common/columnKit';
import type { Messages } from '@/lib/i18n/messages.id';
import { formatRatePercent } from './rate';
import type { TaxCode, TaxKind } from './schema';

const col = createColumnHelper<TaxCode>();

const KIND_KEY: Record<TaxKind, keyof Messages['taxCodes']> = {
  PPN_OUTPUT: 'kindPpnOutput', PPN_INPUT: 'kindPpnInput',
  PPH_PAYABLE: 'kindPphPayable', PPH_PREPAID: 'kindPphPrepaid',
};

export function buildTaxCodeColumns(
  t: Messages,
  accountLabel: (id: string) => string,
  handlers: { onEdit: (x: TaxCode) => void; onToggleActive: (x: TaxCode) => void; onDelete: (x: TaxCode) => void },
) {
  return [
    col.accessor('code', { header: t.taxCodes.code }),
    col.accessor('name', { header: t.taxCodes.name }),
    col.accessor('kind', { header: t.taxCodes.kind, cell: (c) => <Badge variant="outline">{t.taxCodes[KIND_KEY[c.getValue()]]}</Badge> }),
    col.accessor('rate', { header: t.taxCodes.rate, cell: (c) => <span className="font-mono tabular-nums">{formatRatePercent(c.getValue())}</span> }),
    col.accessor('taxAccountId', { header: t.taxCodes.taxAccount, cell: (c) => accountLabel(c.getValue()) }),
    activeStatusColumn<TaxCode>(t.crud.status),
    masterActionsColumn<TaxCode>(handlers),
  ];
}
