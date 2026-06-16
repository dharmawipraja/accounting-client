import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { buildTaxCodeColumns } from './columns';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

export function TaxCodesPage() {
  const t = useT();
  const list = taxCodesApi.useList();
  const accounts = accountsApi.useList();
  const deactivate = taxCodesApi.useDeactivate();
  const remove = taxCodesApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TaxCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; taxCode: TaxCode } | null>(null);

  const accountLabel = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? '—';
  }, [accounts.data]);

  const columns = useMemo(
    () => buildTaxCodeColumns(t, accountLabel, {
      onEdit: (x) => setEditing(x),
      onDeactivate: (x) => setConfirm({ kind: 'deactivate', taxCode: x }),
      onDelete: (x) => setConfirm({ kind: 'delete', taxCode: x }),
    }),
    [t, accountLabel],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((x) => !q || x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
  }, [list.data, search]);

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.taxCode.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader title={t.taxCodes.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
        </RoleGate>
      } />

      <div className="mb-4 max-w-xs">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <QueryState query={list} loading={<SkeletonTable rows={8} cols={4} />} onRetry>
        {() => <DataTable columns={columns} data={rows} />}
      </QueryState>

      <TaxCodeFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <TaxCodeFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} mode="edit" taxCode={editing ?? undefined} />

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
