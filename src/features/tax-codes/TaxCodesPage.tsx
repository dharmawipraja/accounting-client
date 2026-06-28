import { useMemo } from 'react';
import { accountsApi } from '@/features/accounts/hooks';
import { useT } from '@/lib/i18n/useT';
import { MasterDataListPage } from '@/features/master-data/MasterDataListPage';
import { buildTaxCodeColumns } from './columns';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

const LIMIT = 20;

export function TaxCodesPage() {
  const t = useT();
  const accounts = accountsApi.useList();
  const accountLabel = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? '—';
  }, [accounts.data]);

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
