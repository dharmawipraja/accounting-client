import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Role } from '@/stores/session';
import { toastApiError } from '@/lib/api/toastApiError';
import { useT } from '@/lib/i18n/useT';

export interface PageEnvelope<T> { data: T[]; total: number; limit: number; offset: number }

export type LifecycleKind = 'post' | 'void' | 'reverse';
export type ActionKind = LifecycleKind | 'delete';

export type KeyedMutation = UseMutationResult<unknown, ApiError, { id: string; idempotencyKey: string }>;
export type IdMutation = UseMutationResult<unknown, ApiError, string>;

export interface ActionConfig<K extends ActionKind> {
  mutation: K extends 'delete' ? IdMutation : KeyedMutation;
  success: string;
  confirm: { title: string; description?: string; label: string };
}
export type ActionsConfig = { [K in ActionKind]?: ActionConfig<K> };

export interface FilterConfig {
  /** server query-param name, e.g. 'status' | 'direction' | 'sourceType' */
  param: string;
  /** options[0] is the ALL sentinel (value 'ALL' → param omitted from the query) */
  options: readonly { value: string; label: string }[];
}

export type ListHook<T> = (
  query: Record<string, string | number | undefined>,
) => UseQueryResult<PageEnvelope<T>, ApiError>;

export type ActionHandlers<T> = Partial<Record<'onPost' | 'onVoid' | 'onReverse' | 'onDelete', (doc: T) => void>>;

export interface DocumentListConfig<T extends { id: string }> {
  title: string;
  colCount: number;
  list: ListHook<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: (handlers: ActionHandlers<T>) => ColumnDef<T, any>[];
  actions: ActionsConfig;
  /** Role-gated New control(s). Pre-rendered JSX so route literals keep their types. */
  newControl?: ReactNode;
  /** Roles allowed to see newControl. Default: ACCOUNTANT/APPROVER/ADMIN. */
  newRole?: Role[];
  filters?: FilterConfig[];
  /** Omit to render no search box. `predicate` receives the row and the lowercased query. */
  search?: { placeholder?: string; predicate: (doc: T, q: string) => boolean };
  /** Seed filter values, e.g. { status: 'DRAFT' } for a deep-link. */
  initialFilters?: Record<string, string>;
  /** Page size. Default 20. */
  limit?: number;
}

const HANDLER_NAME: Record<ActionKind, 'onPost' | 'onVoid' | 'onReverse' | 'onDelete'> = {
  post: 'onPost', void: 'onVoid', reverse: 'onReverse', delete: 'onDelete',
};

type Pending<T> = { kind: ActionKind; doc: T; idempotencyKey?: string };

export interface DocumentListController<T> {
  page: UseQueryResult<PageEnvelope<T>, ApiError>;
  offset: number;
  limit: number;
  setOffset: (n: number) => void;
  search: string;
  setSearch: (s: string) => void;
  filterValues: Record<string, string>;
  setFilter: (param: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  applySearch: (rows: T[]) => T[];
  dialog: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    destructive: boolean;
    pending: boolean;
    onConfirm: () => void;
  };
}

export function useDocumentListController<T extends { id: string }>(
  config: DocumentListConfig<T>,
): DocumentListController<T> {
  const t = useT();
  const limit = config.limit ?? 20;
  const [offset, setOffset] = useState(0);
  const [search, setSearchState] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.filters ?? []) init[f.param] = config.initialFilters?.[f.param] ?? 'ALL';
    return init;
  });
  const [pending, setPending] = useState<Pending<T> | null>(null);

  const setSearch = (s: string) => { setSearchState(s); setOffset(0); };
  const setFilter = (param: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [param]: value }));
    setOffset(0);
  };

  const query: Record<string, string | number | undefined> = { limit, offset };
  for (const [param, value] of Object.entries(filterValues)) {
    query[param] = value === 'ALL' ? undefined : value;
  }
  const page = config.list(query);

  const columns = useMemo(() => {
    const handlers: ActionHandlers<T> = {};
    for (const kind of Object.keys(config.actions) as ActionKind[]) {
      handlers[HANDLER_NAME[kind]] = (doc: T) =>
        setPending({ kind, doc, idempotencyKey: kind === 'delete' ? undefined : crypto.randomUUID() });
    }
    return config.columns(handlers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.columns, config.actions]);

  function runAction() {
    if (!pending) return;
    const def = config.actions[pending.kind];
    if (!def) return;
    const close = () => setPending(null);
    if (pending.kind === 'delete') {
      (def.mutation as IdMutation).mutate(pending.doc.id, {
        onSuccess: () => { toast.success(def.success); close(); },
        onError: () => { toast.error(t.common.error); close(); },
      });
    } else {
      (def.mutation as KeyedMutation).mutate(
        { id: pending.doc.id, idempotencyKey: pending.idempotencyKey! },
        { onSuccess: () => { toast.success(def.success); close(); }, onError: (e) => { toastApiError(e, t); close(); } },
      );
    }
  }

  const activeDef = pending ? config.actions[pending.kind] : undefined;
  const anyPending = Object.values(config.actions).some((a) => a?.mutation.isPending);

  return {
    page, offset, limit, setOffset, search, setSearch, filterValues, setFilter, columns,
    applySearch: (rows: T[]) => {
      if (!config.search || !search) return rows;
      const q = search.toLowerCase();
      return rows.filter((r) => config.search!.predicate(r, q));
    },
    dialog: {
      open: !!pending,
      onOpenChange: (o: boolean) => { if (!o) setPending(null); },
      title: activeDef?.confirm.title ?? '',
      description: activeDef?.confirm.description,
      confirmLabel: activeDef?.confirm.label ?? '',
      destructive: pending?.kind !== 'post',
      pending: anyPending,
      onConfirm: runAction,
    },
  };
}
