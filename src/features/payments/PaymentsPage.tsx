import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { partnersApi } from '@/features/partners/hooks';
import { accountsApi } from '@/features/accounts/hooks';
import { buildPaymentColumns } from './columns';
import { paymentsApi, usePostPayment, useVoidPayment } from './hooks';
import type { Payment } from './schema';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;
type PendingAction = { kind: 'delete' | 'post' | 'void'; payment: Payment; idempotencyKey?: string };

export function PaymentsPage() {
  const t = useT();
  const list = paymentsApi.useList();
  const partners = partnersApi.useList();
  const accounts = accountsApi.useList();
  const remove = paymentsApi.useRemove();
  const post = usePostPayment();
  const voidPayment = useVoidPayment();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);

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

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((p) => {
      if (status !== 'ALL' && p.status !== status && !(status === 'VOID' && p.status.startsWith('VOID'))) return false;
      return !q || (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

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
          <Button asChild><Link to="/payments/new"><Plus className="size-4" /> {t.payments.newPayment}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.payments.statusAll : s === 'DRAFT' ? t.payments.statusDraft : s === 'POSTED' ? t.payments.statusPosted : t.payments.statusVoid}
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
        pending={remove.isPending || post.isPending || voidPayment.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
