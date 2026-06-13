import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { buildInvoiceColumns } from './columns';
import { salesInvoicesApi } from './hooks';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

export function SalesInvoicesPage() {
  const t = useT();
  const list = salesInvoicesApi.useList();
  const partners = partnersApi.useList();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const columns = useMemo(() => buildInvoiceColumns(t, partnerName), [t, partnerName]);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((inv) => {
      if (status !== 'ALL' && inv.status !== status && !(status === 'VOID' && inv.status.startsWith('VOID'))) return false;
      return !q || (inv.invoiceNumber ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

  return (
    <div>
      <PageHeader title={t.salesInvoices.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/sales-invoices/new"><Plus className="size-4" /> {t.salesInvoices.newInvoice}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.salesInvoices.statusAll : s === 'DRAFT' ? t.salesInvoices.statusDraft : s === 'POSTED' ? t.salesInvoices.statusPosted : t.salesInvoices.statusVoid}
            </Button>
          ))}
        </div>
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" />
        : list.isError ? <ErrorState error={list.error} />
        : <DataTable columns={columns} data={rows} />}
    </div>
  );
}
