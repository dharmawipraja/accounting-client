import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useT } from '@/lib/i18n/useT';
import { buildPartnerColumns } from './columns';
import { PartnerFormDialog } from './PartnerFormDialog';
import { partnersApi } from './hooks';
import type { Partner } from './schema';

const LIMIT = 20;

export function PartnersPage() {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const page = partnersApi.usePagedList({ limit: LIMIT, offset });
  const deactivate = partnersApi.useDeactivate();
  const remove = partnersApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partner | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; partner: Partner } | null>(null);

  const columns = useMemo(
    () => buildPartnerColumns(t, {
      onEdit: (p) => setEditing(p),
      onDeactivate: (p) => setConfirm({ kind: 'deactivate', partner: p }),
      onDelete: (p) => setConfirm({ kind: 'delete', partner: p }),
    }),
    [t],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (page.data?.data ?? []).filter((p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [page.data, search]);

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.partner.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader title={t.partners.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
        </RoleGate>
      } />

      <div className="mb-4 max-w-xs space-y-1">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
      </div>

      {page.isLoading ? <Skeleton className="h-40 w-full" />
        : page.isError ? <ErrorState error={page.error} />
        : <>
            <DataTable columns={columns} data={rows} />
            <Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />
          </>}

      <PartnerFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <PartnerFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} mode="edit" partner={editing ?? undefined} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle}
        description={confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined}
        confirmLabel={confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate}
        destructive={confirm?.kind === 'delete'}
        pending={deactivate.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
