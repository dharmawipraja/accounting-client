import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { accountsApi } from '@/features/accounts/hooks';
import { buildPaymentColumns } from './columns';
import { paymentsApi, usePostPayment, useVoidPayment } from './hooks';
import type { Payment } from './schema';

const LIMIT = 20;
const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;
const DIRECTIONS = ['ALL', 'RECEIPT', 'DISBURSEMENT'] as const;
type PendingAction = { kind: 'delete' | 'post' | 'void'; payment: Payment; idempotencyKey?: string };

export function PaymentsPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const accounts = accountsApi.useList();
  const remove = paymentsApi.useRemove();
  const post = usePostPayment();
  const voidPayment = useVoidPayment();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);
  const [offset, setOffset] = useState(0);

  const page = paymentsApi.usePagedList({
    limit: LIMIT,
    offset,
    status: status === 'ALL' ? undefined : status,
    direction: direction === 'ALL' ? undefined : direction,
  });

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);
  const accountName = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? id;
  }, [accounts.data]);

  const columns = useMemo(
    () => buildPaymentColumns(t, partnerName, accountName, {
      onDelete: (p) => setAction({ kind: 'delete', payment: p }),
      onPost: (p) => setAction({ kind: 'post', payment: p, idempotencyKey: crypto.randomUUID() }),
      onVoid: (p) => setAction({ kind: 'void', payment: p, idempotencyKey: crypto.randomUUID() }),
    }),
    [t, partnerName, accountName],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.payment.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.payment.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.payments.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      voidPayment.mutate({ id: action.payment.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.payments.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.payments.confirmPostTitle, desc: t.payments.confirmPostDesc, label: t.payments.post },
    void: { title: t.payments.confirmVoidTitle, desc: t.payments.confirmVoidDesc, label: t.payments.void },
  } as const;

  return (
    <div>
      <PageHeader title={t.payments.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/payments/new" search={{ direction: 'RECEIPT' }}><Plus className="size-4" /> {t.payments.directionReceipt}</Link></Button>
            <Button asChild><Link to="/payments/new" search={{ direction: 'DISBURSEMENT' }}><Plus className="size-4" /> {t.payments.directionDisbursement}</Link></Button>
          </div>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="max-w-xs space-y-1">
          <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
        </div>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => { setStatus(s); setOffset(0); }}>
              {s === 'ALL' ? t.payments.statusAll : s === 'DRAFT' ? t.payments.statusDraft : s === 'POSTED' ? t.payments.statusPosted : t.payments.statusVoid}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {DIRECTIONS.map((d) => (
            <Button key={d} size="sm" variant={direction === d ? 'default' : 'outline'} onClick={() => { setDirection(d); setOffset(0); }}>
              {d === 'ALL' ? t.payments.directionAll : d === 'RECEIPT' ? t.payments.directionReceipt : t.payments.directionDisbursement}
            </Button>
          ))}
        </div>
      </div>

      <QueryState query={page} loading={<SkeletonTable rows={8} cols={6} />} onRetry>
        {(env) => {
          const q = search.toLowerCase();
          const rows = env.data.filter((p) =>
            !q || (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q));
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
        pending={remove.isPending || post.isPending || voidPayment.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
