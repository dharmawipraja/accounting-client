import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { SkeletonCards } from '@/components/common/skeletons/SkeletonCards';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { usePreferences } from '@/stores/preferences';
import { Reveal } from '@/components/common/Reveal';
import { DashboardFilters } from './DashboardFilters';
import { DashboardHero } from './DashboardHero';
import { OverdueReceivablesCard } from './OverdueReceivablesCard';
import { SummaryCard } from './SummaryCard';
import { useBalanceSheet, useCashFlow, useDraftCount, useIncomeStatement } from './hooks';
import { computePeriod, periodValid, resolveStoredPeriod, type PeriodPreset } from './period';

export function DashboardPage() {
  const t = useT();
  const stored = usePreferences((s) => s.dashboardPeriod);
  const setPeriod = usePreferences((s) => s.setDashboardPeriod);
  const period = useMemo(() => resolveStoredPeriod(stored, new Date()), [stored]);
  const valid = periodValid(period);
  const asOf = valid ? period.to : '';

  const bs = useBalanceSheet(asOf);
  const is = useIncomeStatement(period.from, period.to, valid);
  const cf = useCashFlow(period.from, period.to, valid);
  const drafts = useDraftCount();

  const rangeHint = valid ? `${formatDateID(period.from)} – ${formatDateID(period.to)}` : undefined;
  const asOfHint = valid ? `${t.dashboard.asOfLabel} ${formatDateID(period.to)}` : undefined;
  const money = (v?: string) => (v ? <MoneyText value={v} /> : '—');

  // Show a skeleton grid on the very first paint before any query has resolved.
  const allPending = bs.isPending && is.isPending && cf.isPending && drafts.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.dashboard} />
      <DashboardFilters
        period={period}
        onSelectPreset={(preset: Exclude<PeriodPreset, 'custom'>) => setPeriod(computePeriod(preset, new Date()))}
        onCustomChange={(from, to) => setPeriod({ preset: 'custom', from, to })}
      />
      {allPending ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="space-y-6">
          <Reveal index={0}>
            <DashboardHero
              assets={bs.data?.totalAssets}
              liabilities={bs.data?.totalLiabilities}
              equity={bs.data?.totalEquity}
              loading={bs.isLoading}
              error={bs.isError}
              onRetry={() => void bs.refetch()}
              asOf={asOfHint}
            />
          </Reveal>
          <OverdueReceivablesCard asOf={asOf} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal index={1}>
              <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={2}>
              <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={3}>
              <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={4}>
              <Link to="/journals" search={{ status: 'DRAFT' }} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <SummaryCard interactive title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
              </Link>
            </Reveal>
          </div>
        </div>
      )}
    </div>
  );
}
