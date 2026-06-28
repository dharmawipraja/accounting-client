import { useT } from '@/lib/i18n/useT';
import { MasterDataListPage } from '@/features/master-data/MasterDataListPage';
import { buildPartnerColumns } from './columns';
import { PartnerFormDialog } from './PartnerFormDialog';
import { partnersApi } from './hooks';
import type { Partner } from './schema';

const LIMIT = 20;

export function PartnersPage() {
  const t = useT();
  return (
    <MasterDataListPage<Partner>
      title={t.partners.title}
      usePagedList={partnersApi.usePagedList}
      actions={{ activate: partnersApi.useActivate(), deactivate: partnersApi.useDeactivate(), remove: partnersApi.useRemove() }}
      columns={(h) => buildPartnerColumns(t, h)}
      skeletonCols={5}
      formDialog={(p) => <PartnerFormDialog open={p.open} onOpenChange={p.onOpenChange} mode={p.mode} partner={p.item} />}
      limit={LIMIT}
    />
  );
}
