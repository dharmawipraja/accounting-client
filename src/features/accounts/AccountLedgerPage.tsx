import { useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDateControls } from '@/features/reports/ReportDateControls';
import { GeneralLedgerView } from '@/features/reports/GeneralLedgerView';
import { useReport } from '@/features/reports/useReport';
import { generalLedgerSchema } from '@/features/reports/schema';
import { formatDateID, toApiDate, isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { accountTypeLabel, normalBalanceLabel } from './account-meta';
import { useAccount, useAccountBalance } from './hooks';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

/** Account drill-down: the account's point-in-time balance plus its general-ledger
 *  movement over a date range (GET /accounts/{id}/balance + /reports/general-ledger). */
export function AccountLedgerPage({ id }: { id: string }) {
  const t = useT();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));

  const account = useAccount(id);
  const balance = useAccountBalance(id, to);
  const spanTooLong = isRangeValid(from, to) && differenceInCalendarDays(parseISO(to), parseISO(from)) > 366;
  const gl = useReport('/reports/general-ledger', { accountId: id, from, to }, generalLedgerSchema, !!id && isRangeValid(from, to) && !spanTooLong);

  const title = account.data ? `${account.data.code} · ${account.data.name}` : t.accounts.title;

  return (
    <div>
      <PageHeader title={title} parent={{ to: '/accounts', label: t.nav.accounts }} />

      <QueryState query={account} loading={<Skeleton className="h-16 w-full max-w-md" />} onRetry>
        {(acc) => (
          <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-1 rounded-lg border p-4">
            <div>
              <div className="text-xs text-muted-foreground">{t.accounts.type}</div>
              <div className="text-sm font-medium">{accountTypeLabel(t, acc.type)} · {normalBalanceLabel(t, acc.normalBalance)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t.reports.balanceAsOf} {formatDateID(to)}</div>
              {balance.data ? (
                <div className="text-lg font-semibold"><MoneyText value={balance.data.balance} /></div>
              ) : (
                <Skeleton className="h-6 w-32" />
              )}
            </div>
          </div>
        )}
      </QueryState>

      <div className="mb-4">
        <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      </div>

      {spanTooLong ? (
        <p className="text-sm text-destructive" role="alert">{t.reports.spanTooLong}</p>
      ) : (
        <QueryState query={gl} loading={<SkeletonTable rows={6} cols={6} />} onRetry>
          {(data) => <GeneralLedgerView gl={data} showAccountLine={false} />}
        </QueryState>
      )}
    </div>
  );
}
