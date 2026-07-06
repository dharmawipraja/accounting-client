import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { AGING_BUCKETS } from '@/features/reports/schema';
import { useArAging } from './hooks';

/** Overdue-receivables tile: the sum of all past-due AR buckets (everything but
 *  Current), linking to the AR aging report. Actionable-only — it renders nothing
 *  while loading or when there is no overdue AR, so the dashboard stays calm. */
export function OverdueReceivablesCard({ asOf }: { asOf: string }) {
  const t = useT();
  const aging = useArAging(asOf);

  if (!aging.data) return null;
  const overdue = AGING_BUCKETS.filter((b) => b !== 'Current').reduce(
    (acc, b) => acc.plus(Money.from(aging.data!.totalsByBucket[b] ?? '0')),
    Money.zero(),
  );
  if (!overdue.gt(Money.zero())) return null;

  return (
    <Link
      to="/reports/ar-aging"
      className="group flex items-center justify-between gap-4 rounded-xl border border-warning/40 bg-warning/10 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        <Clock className="size-5 shrink-0 text-warning-strong" aria-hidden="true" />
        <div>
          <div className="text-sm font-medium">{t.dashboard.overdueReceivables}</div>
          <div className="text-xs text-muted-foreground">{t.dashboard.overdueHint}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-lg font-semibold"><MoneyText value={overdue.toApi()} /></span>
        <span className="text-sm text-primary group-hover:underline">{t.dashboard.viewAging}</span>
      </div>
    </Link>
  );
}
