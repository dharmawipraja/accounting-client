import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusChip } from '@/components/common/statusChips';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { usePeriods, useYearEndStatus } from './usePeriods';
import { useGeneratePeriods, useClosePeriod, useReopenPeriod, useRunYearEnd, useReopenYear } from './mutations';
import { isPeriodClosed, isYearClosed, monthLabel, type Period } from './schema';

type Pending =
  | { kind: 'close' | 'reopen'; period: Period }
  | { kind: 'generate' | 'runYearEnd' | 'reopenYear' }
  | null;

export function PeriodsPage() {
  const t = useT();
  const [fiscalYear, setFiscalYear] = useState(() => new Date().getFullYear());
  const [pending, setPending] = useState<Pending>(null);
  const periods = usePeriods(fiscalYear);
  const yearEnd = useYearEndStatus(fiscalYear);

  const generate = useGeneratePeriods();
  const close = useClosePeriod();
  const reopen = useReopenPeriod();
  const runYearEnd = useRunYearEnd();
  const reopenYear = useReopenYear();

  const anyOpen = (periods.data ?? []).some((p) => !isPeriodClosed(p));
  const closed = isYearClosed(yearEnd.data);
  const isMutating =
    close.isPending || reopen.isPending || generate.isPending || runYearEnd.isPending || reopenYear.isPending;

  const dialogs = {
    close: { title: t.periods.close, description: t.periods.confirmClose, confirmLabel: t.periods.close, destructive: true },
    reopen: { title: t.periods.reopen, description: t.periods.confirmReopen, confirmLabel: t.periods.reopen, destructive: false },
    generate: { title: t.periods.generate, description: t.periods.confirmGenerate, confirmLabel: t.periods.generate, destructive: false },
    runYearEnd: { title: t.periods.runYearEnd, description: t.periods.confirmYearEnd, confirmLabel: t.periods.runYearEnd, destructive: true },
    reopenYear: { title: t.periods.reopenYear, description: t.periods.confirmReopenYear, confirmLabel: t.periods.reopenYear, destructive: false },
  } as const;
  const dialog = pending ? dialogs[pending.kind] : null;

  function confirmRun() {
    if (!pending) return;
    const idempotencyKey = crypto.randomUUID();
    const done = { onSettled: () => setPending(null) };
    if (pending.kind === 'close') close.mutate({ id: pending.period.id, idempotencyKey }, done);
    else if (pending.kind === 'reopen') reopen.mutate({ id: pending.period.id, idempotencyKey }, done);
    else if (pending.kind === 'generate') generate.mutate({ fiscalYear, idempotencyKey }, done);
    else if (pending.kind === 'runYearEnd') runYearEnd.mutate({ fiscalYear, idempotencyKey }, done);
    else reopenYear.mutate({ fiscalYear, idempotencyKey }, done);
  }

  return (
    <div>
      <PageHeader title={t.periods.title} />

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">{t.periods.fiscalYear}</span>
        <Button variant="outline" size="icon" aria-label={t.periods.prevYear} onClick={() => setFiscalYear((y) => y - 1)}>−</Button>
        <span className="w-16 text-center tabular-nums">{fiscalYear}</span>
        <Button variant="outline" size="icon" aria-label={t.periods.nextYear} onClick={() => setFiscalYear((y) => y + 1)}>+</Button>
      </div>

      <QueryState query={periods} loading={<SkeletonTable rows={6} cols={3} />} onRetry>
        {(rows) => rows.length === 0 ? (
          <div className="space-y-3 rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">{t.periods.noPeriods}</p>
            <RoleGate allow={['APPROVER', 'ADMIN']}>
              <Button onClick={() => setPending({ kind: 'generate' })}>{t.periods.generate}</Button>
            </RoleGate>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.periods.bulan}</TableHead>
                  <TableHead>{t.periods.status}</TableHead>
                  <TableHead className="text-right">{t.periods.aksi}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const c = isPeriodClosed(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{monthLabel(p)}</TableCell>
                      <TableCell><PeriodStatusChip closed={c} t={t} /></TableCell>
                      <TableCell className="text-right">
                        {c ? (
                          <RoleGate allow={['ADMIN']}>
                            <Button variant="outline" size="sm" onClick={() => setPending({ kind: 'reopen', period: p })}>{t.periods.reopen}</Button>
                          </RoleGate>
                        ) : (
                          <RoleGate allow={['APPROVER', 'ADMIN']}>
                            <Button variant="outline" size="sm" onClick={() => setPending({ kind: 'close', period: p })}>{t.periods.close}</Button>
                          </RoleGate>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryState>

      <div className="mt-6 space-y-2 rounded-lg border p-4">
        <h2 className="font-semibold">{t.periods.yearEndStatus}</h2>
        {yearEnd.isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {closed
              ? `${t.periods.closedOn} ${yearEnd.data?.closedAt ? formatDateID(yearEnd.data.closedAt.slice(0, 10)) : ''}`
              : t.periods.notClosed}
          </p>
        )}
        {!closed && anyOpen ? <p className="text-xs text-muted-foreground">{t.periods.closeAllFirst}</p> : null}
        <RoleGate allow={['ADMIN']}>
          {closed ? (
            <Button variant="outline" onClick={() => setPending({ kind: 'reopenYear' })}>{t.periods.reopenYear}</Button>
          ) : (
            <Button onClick={() => setPending({ kind: 'runYearEnd' })}>{t.periods.runYearEnd}</Button>
          )}
        </RoleGate>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel ?? ''}
        destructive={dialog?.destructive}
        pending={isMutating}
        onConfirm={confirmRun}
      />
    </div>
  );
}
