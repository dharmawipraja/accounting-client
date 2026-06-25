import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { partnersApi } from '@/features/partners/hooks';
import { buildBillColumns } from './columns';
import { purchaseBillsApi, usePostBill, useVoidBill } from './hooks';
import type { PurchaseBill } from './schema';

const LIMIT = 20;

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

type PendingAction = { kind: 'delete' | 'post' | 'void'; bill: PurchaseBill; idempotencyKey?: string };

export function PurchaseBillsPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const remove = purchaseBillsApi.useRemove();
  const post = usePostBill();
  const voidBill = useVoidBill();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);
  const [offset, setOffset] = useState(0);
  const page = purchaseBillsApi.usePagedList({ limit: LIMIT, offset, status: status === 'ALL' ? undefined : status });

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

  return (
    <div>
      <PageHeader title={t.purchaseBills.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/purchase-bills/new"><Plus className="size-4" /> {t.purchaseBills.newBill}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="max-w-xs space-y-1">
          <Input placeholder={t.common.search} value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
          <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
        </div>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => { setStatus(s); setOffset(0); }}>
              {s === 'ALL' ? t.purchaseBills.statusAll : s === 'DRAFT' ? t.purchaseBills.statusDraft : s === 'POSTED' ? t.purchaseBills.statusPosted : t.purchaseBills.statusVoid}
            </Button>
          ))}
        </div>
      </div>

      <QueryState query={page} loading={<SkeletonTable rows={8} cols={6} />} onRetry>
        {(env) => {
          const q = search.toLowerCase();
          const rows = env.data.filter((bill) =>
            !q || (bill.billRef ?? '').toLowerCase().includes(q) || partnerName(bill.partnerId).toLowerCase().includes(q));
          return (
            <>
              <DataTable columns={columns} data={rows} />
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>

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
