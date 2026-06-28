import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';

export interface MasterDataActionHandlers<TItem> {
  onEdit: (item: TItem) => void;
  onToggleActive: (item: TItem) => void;
  onDelete: (item: TItem) => void;
}

type Mutation = UseMutationResult<unknown, ApiError, string>;

export interface MasterDataActions {
  activate: Mutation;
  deactivate: Mutation;
  remove: Mutation;
}

export function useMasterDataListController<TItem extends { id: string; isActive: boolean }>(
  actions: MasterDataActions,
  limit: number,
) {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const [search, setSearchRaw] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; item: TItem } | null>(null);

  const setSearch = (v: string) => { setSearchRaw(v); setOffset(0); };

  const handlers: MasterDataActionHandlers<TItem> = useMemo(
    () => ({
      onEdit: (item) => setEditing(item),
      onToggleActive: (item) =>
        item.isActive
          ? setConfirm({ kind: 'deactivate', item })
          : actions.activate.mutate(item.id, {
              onSuccess: () => toast.success(t.crud.activated),
              onError: () => toast.error(t.common.error),
            }),
      onDelete: (item) => setConfirm({ kind: 'delete', item }),
    }),
    [actions, t],
  );

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? actions.deactivate : actions.remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.item.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  const confirmProps = {
    open: !!confirm,
    onOpenChange: (o: boolean) => { if (!o) setConfirm(null); },
    title: confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle,
    description: confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined,
    confirmLabel: confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate,
    destructive: confirm?.kind === 'delete',
    pending: actions.deactivate.isPending || actions.remove.isPending,
    onConfirm: runConfirm,
  };

  return { offset, setOffset, search, setSearch, creating, setCreating, editing, setEditing, handlers, confirmProps, limit };
}
