import { accountsApi } from '@/features/accounts/hooks';
import { useEntityLabelMap } from '@/lib/hooks/useEntityLabelMap';
import { useT } from '@/lib/i18n/useT';
import { MasterDataListPage } from '@/features/master-data/MasterDataListPage';
import { buildTaxCodeColumns } from './columns';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

const LIMIT = 20;

export function TaxCodesPage() {
  const t = useT();
  const accountLabel = useEntityLabelMap(accountsApi.useList, (a) => `${a.code} — ${a.name}`, '—');

  return (
    <MasterDataListPage<TaxCode>
      title={t.taxCodes.title}
      usePagedList={taxCodesApi.usePagedList}
      actions={{ activate: taxCodesApi.useActivate(), deactivate: taxCodesApi.useDeactivate(), remove: taxCodesApi.useRemove() }}
      columns={(h) => buildTaxCodeColumns(t, accountLabel, h)}
      skeletonCols={4}
      formDialog={(p) => <TaxCodeFormDialog open={p.open} onOpenChange={p.onOpenChange} mode={p.mode} taxCode={p.item} />}
      limit={LIMIT}
    />
  );
}
