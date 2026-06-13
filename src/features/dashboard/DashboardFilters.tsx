import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { periodValid, type Period, type PeriodPreset } from './period';

interface Props {
  period: Period;
  onSelectPreset: (preset: Exclude<PeriodPreset, 'custom'>) => void;
  onCustomChange: (from: string, to: string) => void;
}

const PRESETS: { key: Exclude<PeriodPreset, 'custom'>; labelKey: 'thisMonth' | 'thisQuarter' | 'thisYear' }[] = [
  { key: 'month', labelKey: 'thisMonth' },
  { key: 'quarter', labelKey: 'thisQuarter' },
  { key: 'year', labelKey: 'thisYear' },
];

export function DashboardFilters({ period, onSelectPreset, onCustomChange }: Props) {
  const t = useT();
  const valid = periodValid(period);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={period.preset === p.key ? 'default' : 'outline'}
            onClick={() => onSelectPreset(p.key)}
          >
            {t.dashboard[p.labelKey]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={period.preset === 'custom' ? 'default' : 'outline'}
          onClick={() => onCustomChange(period.from, period.to)}
        >
          {t.dashboard.custom}
        </Button>
      </div>

      {period.preset === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dash-from">{t.dashboard.from}</Label>
            <Input
              id="dash-from"
              type="date"
              aria-label={t.dashboard.from}
              value={period.from}
              onChange={(e) => onCustomChange(e.target.value, period.to)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dash-to">{t.dashboard.to}</Label>
            <Input
              id="dash-to"
              type="date"
              aria-label={t.dashboard.to}
              value={period.to}
              onChange={(e) => onCustomChange(period.from, e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {valid ? (
        <p className="text-xs text-muted-foreground">
          {formatDateID(period.from)} – {formatDateID(period.to)}
        </p>
      ) : (
        <p className="text-xs text-destructive">{t.dashboard.rangeInvalid}</p>
      )}
    </div>
  );
}
