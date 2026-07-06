import { useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { PageHeader } from '@/components/common/PageHeader';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { ReportDateControls } from './ReportDateControls';
import { GeneralLedgerView } from './GeneralLedgerView';
import { ReportContent } from './ReportContent';
import { useReport } from './useReport';
import { generalLedgerSchema } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

export function GeneralLedgerPage({ initialAccountId }: { initialAccountId?: string }) {
  const t = useT();
  const [accountId, setAccountId] = useState(initialAccountId ?? '');
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  // The API caps GL spans at 366 days (422 beyond) — block the request and say so.
  const spanTooLong = isRangeValid(from, to) && differenceInCalendarDays(parseISO(to), parseISO(from)) > 366;
  const enabled = !!accountId && isRangeValid(from, to) && !spanTooLong;
  const query = useReport('/reports/general-ledger', { accountId: accountId || undefined, from, to }, generalLedgerSchema, enabled);
  return (
    <div>
      <PageHeader title={t.reports.generalLedger} parent={{ to: '/reports', label: t.nav.reports }} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t.reports.account}</span>
          <AccountSelect value={accountId} onChange={setAccountId} aria-label={t.reports.account} />
        </div>
        <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      </div>
      {!accountId ? (
        <p className="text-sm text-muted-foreground">{t.reports.selectAccount}</p>
      ) : spanTooLong ? (
        <p className="text-sm text-destructive" role="alert">{t.reports.spanTooLong}</p>
      ) : (
        <ReportContent query={query} loading={<SkeletonTable rows={6} cols={4} />}>
          {(gl) => <GeneralLedgerView gl={gl} />}
        </ReportContent>
      )}
    </div>
  );
}
