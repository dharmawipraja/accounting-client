import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';

interface Props {
  assets?: string;
  liabilities?: string;
  equity?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  asOf?: string;
}

/** Navy premium balance-sheet hero: Total Aset dominant, with the accounting
 *  equation (Kewajiban = Ekuitas) as supporting figures. */
export function DashboardHero({ assets, liabilities, equity, loading, error, onRetry, asOf }: Props) {
  const t = useT();
  return (
    <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-lg">
      <p className="text-xs font-semibold tracking-wide uppercase text-sidebar-foreground/70">
        {t.dashboard.financialPosition}
      </p>
      {loading ? (
        <div className="mt-2 space-y-3">
          <Skeleton variant="pulse" className="h-10 w-56 bg-white/10" />
          <Skeleton variant="pulse" className="h-5 w-40 bg-white/10" />
        </div>
      ) : error ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-sidebar-foreground/80">{t.dashboard.loadError}</p>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-sidebar-foreground hover:bg-white/10"
              onClick={onRetry}
            >
              {t.dashboard.retry}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-1 text-4xl font-semibold tabular-nums">
            {assets ? <MoneyText value={assets} /> : '—'}
          </div>
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            {t.dashboard.totalAssets} · {asOf}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-white/15 pt-4">
            <div>
              <p className="text-xs text-sidebar-foreground/70">{t.dashboard.totalLiabilities}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">
                {liabilities ? <MoneyText value={liabilities} /> : '—'}
              </p>
            </div>
            <span className="text-lg text-sidebar-ring">=</span>
            <div>
              <p className="text-xs text-sidebar-foreground/70">{t.dashboard.totalEquity}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">
                {equity ? <MoneyText value={equity} /> : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
