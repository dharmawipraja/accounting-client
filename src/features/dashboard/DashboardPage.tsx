import { useState } from 'react';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { DashboardFilters } from './DashboardFilters';
import { SummaryCard } from './SummaryCard';
import { useBalanceSheet, useCashFlow, useDraftCount, useIncomeStatement } from './hooks';
import { computePeriod, periodValid, type Period, type PeriodPreset } from './period';

export function DashboardPage() {
  const t = useT();
  const [period, setPeriod] = useState<Period>(() => computePeriod('year', new Date()));
  const valid = periodValid(period);
  const asOf = valid ? period.to : '';

  const bs = useBalanceSheet(asOf);
  const is = useIncomeStatement(period.from, period.to, valid);
  const cf = useCashFlow(period.from, period.to, valid);
  const drafts = useDraftCount();

  const rangeHint = valid ? `${formatDateID(period.from)} – ${formatDateID(period.to)}` : undefined;
  const asOfHint = valid ? `${t.dashboard.asOfLabel} ${formatDateID(period.to)}` : undefined;
  const money = (v?: string) => (v ? <MoneyText value={v} /> : '—');

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.dashboard} />
      <DashboardFilters
        period={period}
        onSelectPreset={(preset: Exclude<PeriodPreset, 'custom'>) => setPeriod(computePeriod(preset, new Date()))}
        onCustomChange={(from, to) => setPeriod({ preset: 'custom', from, to })}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title={t.dashboard.totalAssets} value={money(bs.data?.totalAssets)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.totalLiabilities} value={money(bs.data?.totalLiabilities)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.totalEquity} value={money(bs.data?.totalEquity)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
      </div>
    </div>
  );
}
