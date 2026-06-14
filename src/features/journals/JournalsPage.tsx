import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { buildJournalColumns } from './columns';
import { useJournalEntries, useDeleteJournalEntry, usePostJournalEntry, useReverseJournalEntry } from './hooks';
import type { JournalEntryListItem } from './schema';

const LIMIT = 20;
const STATUSES = ['ALL', 'DRAFT', 'POSTED'] as const;
const SOURCES = ['ALL', 'MANUAL'] as const;
type PendingAction = { kind: 'delete' | 'post' | 'reverse'; entry: JournalEntryListItem; idempotencyKey?: string };

export function JournalsPage() {
  const t = useT();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('ALL');
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState<PendingAction | null>(null);

  const page = useJournalEntries({
    status: status === 'ALL' ? undefined : status,
    sourceType: source === 'ALL' ? undefined : source,
    limit: LIMIT,
    offset,
  });
  const remove = useDeleteJournalEntry();
  const post = usePostJournalEntry();
  const reverse = useReverseJournalEntry();

  const columns = useMemo(
    () => buildJournalColumns(t, {
      onDelete: (e) => setAction({ kind: 'delete', entry: e }),
      onPost: (e) => setAction({ kind: 'post', entry: e, idempotencyKey: crypto.randomUUID() }),
      onReverse: (e) => setAction({ kind: 'reverse', entry: e, idempotencyKey: crypto.randomUUID() }),
    }),
    [t],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.entry.id, { onSuccess: () => { toast.success(t.journals.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.entry.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.journals.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      reverse.mutate({ id: action.entry.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.journals.reversed); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.journals.confirmPostTitle, desc: t.journals.confirmPostDesc, label: t.journals.post },
    reverse: { title: t.journals.confirmReverseTitle, desc: t.journals.confirmReverseDesc, label: t.journals.reverse },
  } as const;

  function pick<T>(setter: (v: T) => void, value: T) { setter(value); setOffset(0); }

  return (
    <div>
      <PageHeader title={t.journals.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/journals/new"><Plus className="size-4" /> {t.journals.newEntry}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => pick(setStatus, s)}>
              {s === 'ALL' ? t.journals.statusAll : s === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <Button key={s} size="sm" variant={source === s ? 'default' : 'outline'} onClick={() => pick(setSource, s)}>
              {s === 'ALL' ? t.journals.sourceAll : t.journals.sourceManual}
            </Button>
          ))}
        </div>
      </div>

      {page.isLoading ? <Skeleton className="h-40 w-full" />
        : page.isError ? <ErrorState error={page.error} />
        : page.data ? (
          <>
            <DataTable columns={columns} data={page.data.data} />
            <Pagination offset={offset} limit={LIMIT} total={page.data.total} onChange={setOffset} />
          </>
        ) : null}

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? confirmCopy[action.kind].title : ''}
        description={action ? confirmCopy[action.kind].desc : undefined}
        confirmLabel={action ? confirmCopy[action.kind].label : ''}
        destructive={action?.kind !== 'post'}
        pending={remove.isPending || post.isPending || reverse.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
