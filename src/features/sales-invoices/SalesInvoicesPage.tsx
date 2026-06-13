import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { partnersApi } from '@/features/partners/hooks';
import { buildInvoiceColumns } from './columns';
import { salesInvoicesApi, usePostInvoice, useVoidInvoice } from './hooks';
import type { SalesInvoice } from './schema';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

type PendingAction = { kind: 'delete' | 'post' | 'void'; invoice: SalesInvoice; idempotencyKey?: string };

export function SalesInvoicesPage() {
  const t = useT();
  const list = salesInvoicesApi.useList();
  const partners = partnersApi.useList();
  const remove = salesInvoicesApi.useRemove();
  const post = usePostInvoice();
  const voidInvoice = useVoidInvoice();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const columns = useMemo(
    () => buildInvoiceColumns(t, partnerName, {
      onDelete: (inv) => setAction({ kind: 'delete', invoice: inv }),
      onPost: (inv) => setAction({ kind: 'post', invoice: inv, idempotencyKey: crypto.randomUUID() }),
      onVoid: (inv) => setAction({ kind: 'void', invoice: inv, idempotencyKey: crypto.randomUUID() }),
    }),
    [t, partnerName],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.invoice.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.invoice.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.salesInvoices.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      voidInvoice.mutate({ id: action.invoice.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.salesInvoices.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.salesInvoices.confirmPostTitle, desc: t.salesInvoices.confirmPostDesc, label: t.salesInvoices.post },
    void: { title: t.salesInvoices.confirmVoidTitle, desc: t.salesInvoices.confirmVoidDesc, label: t.salesInvoices.void },
  } as const;

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((inv) => {
      if (status !== 'ALL' && inv.status !== status && !(status === 'VOID' && inv.status.startsWith('VOID'))) return false;
      return !q || (inv.invoiceRef ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q);
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

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? confirmCopy[action.kind].title : ''}
        description={action ? confirmCopy[action.kind].desc : undefined}
        confirmLabel={action ? confirmCopy[action.kind].label : ''}
        destructive={action?.kind !== 'post'}
        pending={remove.isPending || post.isPending || voidInvoice.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
