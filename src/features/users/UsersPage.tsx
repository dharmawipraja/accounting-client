import { useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate, useRole, useRoleReady } from '@/components/common/RoleGate';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RowActions } from '@/components/common/RowActions';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { textColumn } from '@/components/common/columnKit';
import { useT } from '@/lib/i18n/useT';
import { useSession } from '@/stores/session';
import { useUsers, useUpdateUser, useResetPassword } from './hooks';
import { UserFormDialog } from './UserFormDialog';
import { TempPasswordDialog } from './TempPasswordDialog';
import { roleLabel } from './user-meta';
import type { User, CreateUserResponse } from './schema';

const LIMIT = 20;

export function UsersPage() {
  const t = useT();
  const currentUserId = useSession((s) => s.user?.id);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [reveal, setReveal] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  const query = useUsers({ limit: LIMIT, offset });
  const update = useUpdateUser();
  const reset = useResetPassword();

  const roleReady = useRoleReady();
  const role = useRole();

  function onCreated(resp: CreateUserResponse) {
    setReveal({ email: resp.user.email, tempPassword: resp.tempPassword });
  }
  async function confirmReset() {
    if (!resetting) return;
    const resp = await reset.mutateAsync(resetting.id);
    setResetting(null);
    setReveal({ email: resp.user.email, tempPassword: resp.tempPassword });
  }
  async function confirmDeactivate() {
    if (!deactivating) return;
    await update.mutateAsync({ id: deactivating.id, data: { isActive: false } });
    setDeactivating(null);
    toast.success(t.crud.deactivated);
  }
  async function activate(u: User) {
    await update.mutateAsync({ id: u.id, data: { isActive: true } });
    toast.success(t.crud.activated);
  }

  const columns: ColumnDef<User>[] = [
    textColumn<User>('email', t.users.email),
    textColumn<User>('name', t.users.name),
    { accessorKey: 'role', header: t.users.role, cell: ({ row }) => roleLabel(t, row.original.role) },
    { accessorKey: 'isActive', header: t.crud.status, cell: ({ row }) => <StatusBadge active={row.original.isActive} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === currentUserId;
        return (
          <RowActions
            onEdit={() => setEditing(u)}
            active={u.isActive}
            onToggleActive={isSelf ? undefined : () => (u.isActive ? setDeactivating(u) : void activate(u))}
            onDelete={() => setResetting(u)}
            deleteLabel={t.users.resetPassword}
          />
        );
      },
    },
  ];

  if (!roleReady) {
    return (
      <div>
        <PageHeader title={t.users.title} />
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }
  if (role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title={t.users.title} />
        <p className="text-sm text-muted-foreground">{t.roles.forbidden}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.users.title}
        actions={
          <RoleGate allow={['ADMIN']}>
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
          </RoleGate>
        }
      />
      <div className="mb-2 max-w-xs">
        <Input aria-label={t.common.search} placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{t.users.searchHint}</p>

      <QueryState query={query} loading={<SkeletonTable rows={6} cols={5} />} onRetry>
        {(env) => {
          const q = search.trim().toLowerCase();
          const rows = q ? env.data.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) : env.data;
          return (
            <>
              {rows.length === 0 ? (
                <EmptyState icon={SearchX} title={t.common.noResults} description={t.common.noResultsHint}
                  action={search ? <Button variant="outline" onClick={() => setSearch('')}>{t.common.clearSearch}</Button> : undefined} />
              ) : (
                <DataTable columns={columns} data={rows} />
              )}
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>

      <UserFormDialog open={creating} onOpenChange={setCreating} mode="create" currentUserId={currentUserId} onCreated={onCreated} />
      <UserFormDialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} mode="edit" user={editing ?? undefined} currentUserId={currentUserId} onCreated={onCreated} />

      {reveal ? (
        <TempPasswordDialog open onOpenChange={(o) => { if (!o) setReveal(null); }} email={reveal.email} tempPassword={reveal.tempPassword} />
      ) : null}

      <ConfirmDialog
        open={!!resetting}
        onOpenChange={(o) => { if (!o) setResetting(null); }}
        title={t.users.confirmResetTitle}
        description={t.users.confirmResetDesc}
        confirmLabel={t.users.resetPassword}
        pending={reset.isPending}
        onConfirm={() => void confirmReset()}
      />
      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(o) => { if (!o) setDeactivating(null); }}
        title={t.users.confirmDeactivateTitle}
        confirmLabel={t.crud.deactivate}
        destructive
        pending={update.isPending}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
