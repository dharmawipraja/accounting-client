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
import { buildBillColumns } from './columns';
import { purchaseBillsApi, usePostBill, useVoidBill } from './hooks';
import type { PurchaseBill } from './schema';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

type PendingAction = { kind: 'delete' | 'post' | 'void'; bill: PurchaseBill; idempotencyKey?: string };

export function PurchaseBillsPage() {
  const t = useT();
  const list = purchaseBillsApi.useList();
  const partners = partnersApi.useList();
  const remove = purchaseBillsApi.useRemove();
  const post = usePostBill();
  const voidBill = useVoidBill();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const columns = useMemo(
    () => buildBillColumns(t, partnerName, {
      onDelete: (bill) => setAction({ kind: 'delete', bill }),
      onPost: (bill) => setAction({ kind: 'post', bill, idempotencyKey: crypto.randomUUID() }),
      onVoid: (bill) => setAction({ kind: 'void', bill, idempotencyKey: crypto.randomUUID() }),
    }),
    [t, partnerName],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.bill.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.bill.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.purchaseBills.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      voidBill.mutate({ id: action.bill.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.purchaseBills.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.purchaseBills.confirmPostTitle, desc: t.purchaseBills.confirmPostDesc, label: t.purchaseBills.post },
    void: { title: t.purchaseBills.confirmVoidTitle, desc: t.purchaseBills.confirmVoidDesc, label: t.purchaseBills.void },
  } as const;

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((bill) => {
      if (status !== 'ALL' && bill.status !== status && !(status === 'VOID' && bill.status.startsWith('VOID'))) return false;
      return !q || (bill.billRef ?? '').toLowerCase().includes(q) || partnerName(bill.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

  return (
    <div>
      <PageHeader title={t.purchaseBills.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/purchase-bills/new"><Plus className="size-4" /> {t.purchaseBills.newBill}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.purchaseBills.statusAll : s === 'DRAFT' ? t.purchaseBills.statusDraft : s === 'POSTED' ? t.purchaseBills.statusPosted : t.purchaseBills.statusVoid}
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
        pending={remove.isPending || post.isPending || voidBill.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
