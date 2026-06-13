import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/useT';
import { ACCOUNT_TYPE_ORDER, type AccountType } from './account-meta';
import { buildAccountColumns } from './columns';
import { AccountFormDialog } from './AccountFormDialog';
import { accountsApi } from './hooks';
import type { Account } from './schema';

const TYPE_LABEL: Record<AccountType, keyof ReturnType<typeof useT>['accounts']> = {
  ASSET: 'typeAset', LIABILITY: 'typeLiabilitas', EQUITY: 'typeEkuitas',
  REVENUE: 'typePendapatan', EXPENSE: 'typeBeban',
};

export function AccountsPage() {
  const t = useT();
  const list = accountsApi.useList();
  const deactivate = accountsApi.useDeactivate();
  const remove = accountsApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; account: Account } | null>(null);

  const columns = useMemo(
    () =>
      buildAccountColumns(t, {
        onEdit: (a) => setEditing(a),
        onDeactivate: (a) => setConfirm({ kind: 'deactivate', account: a }),
        onDelete: (a) => setConfirm({ kind: 'delete', account: a }),
      }),
    [t],
  );

  const grouped = useMemo(() => {
    const rows = (list.data ?? []).filter((a) => {
      const q = search.toLowerCase();
      return !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });
    return ACCOUNT_TYPE_ORDER.map((type) => ({
      type,
      rows: rows.filter((a) => a.type === type).sort((x, y) => x.code.localeCompare(y.code)),
    })).filter((g) => g.rows.length > 0);
  }, [list.data, search]);

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.account.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader
        title={t.accounts.title}
        actions={
          <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> {t.crud.new}
            </Button>
          </RoleGate>
        }
      />

      <div className="mb-4 max-w-xs">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.type}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {t.accounts[TYPE_LABEL[g.type]]}
              </h2>
              <DataTable columns={columns} data={g.rows} />
            </section>
          ))}
        </div>
      )}

      <AccountFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <AccountFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        account={editing ?? undefined}
      />

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
