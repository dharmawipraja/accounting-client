import { useT } from '@/lib/i18n/useT';
import { DataTable } from '@/components/common/DataTable';
import { MasterDataListPage } from '@/features/master-data/MasterDataListPage';
import { ACCOUNT_TYPE_ORDER, accountTypeLabel } from './account-meta';
import { buildAccountColumns } from './columns';
import { AccountFormDialog } from './AccountFormDialog';
import { accountsApi } from './hooks';
import type { Account } from './schema';

const LIMIT = 20;

export function AccountsPage() {
  const t = useT();
  return (
    <MasterDataListPage<Account>
      title={t.accounts.title}
      usePagedList={accountsApi.usePagedList}
      actions={{ activate: accountsApi.useActivate(), deactivate: accountsApi.useDeactivate(), remove: accountsApi.useRemove() }}
      columns={(h) => buildAccountColumns(t, h)}
      skeletonCols={4}
      renderData={(rows, columns) => {
        const grouped = ACCOUNT_TYPE_ORDER.map((type) => ({
          type,
          rows: rows.filter((a) => a.type === type).sort((x, y) => x.code.localeCompare(y.code)),
        })).filter((g) => g.rows.length > 0);
        return (
          <div className="space-y-8">
            {grouped.map((g) => (
              <section key={g.type}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{accountTypeLabel(t, g.type)}</h2>
                <DataTable columns={columns} data={g.rows} />
              </section>
            ))}
          </div>
        );
      }}
      formDialog={(p) => <AccountFormDialog open={p.open} onOpenChange={p.onOpenChange} mode={p.mode} account={p.item} />}
      limit={LIMIT}
    />
  );
}
