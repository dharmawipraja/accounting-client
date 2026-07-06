import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { ListFilters } from './ListFilters';
import { useDocumentListController, type DocumentListConfig } from './useDocumentListController';

export function DocumentListPage<T extends { id: string }>({ config }: { config: DocumentListConfig<T> }) {
  const t = useT();
  const c = useDocumentListController(config);
  const newRole = config.newRole ?? ['ACCOUNTANT', 'APPROVER', 'ADMIN'];

  return (
    <div>
      <PageHeader
        title={config.title}
        actions={config.newControl ? <RoleGate allow={newRole}>{config.newControl}</RoleGate> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {config.search ? (
          <div className="max-w-xs space-y-1">
            <Input
              aria-label={config.search.placeholder ?? t.common.search}
              placeholder={config.search.placeholder ?? t.common.search}
              value={c.search}
              onChange={(e) => c.setSearch(e.target.value)}
            />
          </div>
        ) : null}
        <ListFilters filters={config.filters ?? []} values={c.filterValues} onChange={c.setFilter} />
      </div>

      <QueryState query={c.page} loading={<SkeletonTable rows={8} cols={config.colCount} />} onRetry>
        {(env) => {
          const rows = env.data;
          const empty = env.data.length === 0 ? (
            <EmptyState
              title={t.common.emptyTitle}
              description={t.common.emptyHint}
              action={config.newControl ? <RoleGate allow={newRole}>{config.newControl}</RoleGate> : undefined}
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
              <DataTable columns={c.columns} data={rows} empty={empty} />
              <Pagination offset={c.offset} limit={c.limit} total={env.total} onChange={c.setOffset} />
            </>
          );
        }}
      </QueryState>

      <ConfirmDialog {...c.dialog} />
    </div>
  );
}
