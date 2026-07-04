import type { ReactNode } from 'react';
import { Plus, SearchX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Role } from '@/stores/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import {
  useMasterDataListController,
  type MasterDataActions,
  type MasterDataActionHandlers,
} from './useMasterDataListController';

type Envelope<TItem> = { data: TItem[]; total: number; limit: number; offset: number };

export interface MasterDataListConfig<TItem extends { id: string; isActive: boolean }> {
  title: string;
  newRole?: Role[];
  usePagedList: (query: { limit: number; offset: number }) => UseQueryResult<Envelope<TItem>, ApiError>;
  actions: MasterDataActions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: (handlers: MasterDataActionHandlers<TItem>) => ColumnDef<TItem, any>[];
  /** Page-scoped row filter; default matches `code`/`name` (case-insensitive). */
  search?: (item: TItem, q: string) => boolean;
  /** Skeleton column count. Default 4. */
  skeletonCols?: number;
  /** Row rendering; default a flat DataTable. Accounts overrides with type grouping. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderData?: (rows: TItem[], columns: ColumnDef<TItem, any>[]) => ReactNode;
  /** Renders the feature's create/edit dialog. */
  formDialog: (props: { open: boolean; onOpenChange: (o: boolean) => void; mode: 'create' | 'edit'; item?: TItem }) => ReactNode;
  limit?: number;
}

const DEFAULT_ROLES: Role[] = ['ACCOUNTANT', 'APPROVER', 'ADMIN'];
/** When searching, fetch the whole (bounded) master-data set in one page and filter
 *  client-side. Large enough for any realistic chart-of-accounts / partner list; if a
 *  set ever exceeds it, the UI shows an honest "results may be incomplete" note. */
const SEARCH_LIMIT = 500;

function defaultSearch(item: { code?: string; name?: string }, q: string): boolean {
  if (!q) return true;
  const l = q.toLowerCase();
  return (item.code?.toLowerCase().includes(l) ?? false) || (item.name?.toLowerCase().includes(l) ?? false);
}

export function MasterDataListPage<TItem extends { id: string; isActive: boolean; code?: string; name?: string }>(
  config: MasterDataListConfig<TItem>,
) {
  const t = useT();
  const limit = config.limit ?? 20;
  const c = useMasterDataListController<TItem>(config.actions, limit);
  // Active search fetches the whole set and filters client-side (dataset-wide),
  // instead of the page-scoped filter the document lists still use pending a
  // backend `q` param. Safe because master data is small and bounded.
  const searching = c.search.trim() !== '';
  const query = config.usePagedList(searching ? { limit: SEARCH_LIMIT, offset: 0 } : { limit, offset: c.offset });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<TItem, any>[] = config.columns(c.handlers);
  const match = config.search ?? defaultSearch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderRows = config.renderData ?? ((rows: TItem[], cols: ColumnDef<TItem, any>[]) => <DataTable columns={cols} data={rows} />);

  return (
    <div>
      <PageHeader
        title={config.title}
        actions={
          <RoleGate allow={config.newRole ?? DEFAULT_ROLES}>
            <Button onClick={() => c.setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
          </RoleGate>
        }
      />

      <div className="mb-4 max-w-xs">
        <Input aria-label={t.common.search} placeholder={t.common.search} value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
      </div>

      <QueryState query={query} loading={<SkeletonTable rows={8} cols={config.skeletonCols ?? 4} />} onRetry>
        {(env) => {
          const rows = env.data.filter((item) => match(item, c.search));
          const empty = env.data.length === 0 ? (
            <EmptyState
              title={t.common.emptyTitle}
              description={t.common.emptyHint}
              action={
                <RoleGate allow={config.newRole ?? DEFAULT_ROLES}>
                  <Button onClick={() => c.setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
                </RoleGate>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t.common.noResults}
              description={t.common.noResultsHint}
              action={c.search ? <Button variant="outline" onClick={() => c.setSearch('')}>{t.common.clearSearch}</Button> : undefined}
            />
          );
          return (
            <>
              {rows.length === 0 ? empty : renderRows(rows, columns)}
              {searching ? (
                env.total > env.data.length ? (
                  <p className="mt-3 text-xs text-muted-foreground">{t.common.searchPartial}</p>
                ) : null
              ) : (
                <Pagination offset={c.offset} limit={limit} total={env.total} onChange={c.setOffset} />
              )}
            </>
          );
        }}
      </QueryState>

      {config.formDialog({ open: c.creating, onOpenChange: c.setCreating, mode: 'create' })}
      {config.formDialog({
        open: !!c.editing,
        onOpenChange: (o) => { if (!o) c.setEditing(null); },
        mode: 'edit',
        item: c.editing ?? undefined,
      })}

      <ConfirmDialog {...c.confirmProps} />
    </div>
  );
}
