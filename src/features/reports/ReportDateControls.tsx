import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';

interface Props {
  mode: 'asOf' | 'range';
  asOf?: string;
  from?: string;
  to?: string;
  onAsOf?: (d: string) => void;
  onRange?: (from: string, to: string) => void;
}

export function ReportDateControls({ mode, asOf = '', from = '', to = '', onAsOf, onRange }: Props) {
  const t = useT();
  if (mode === 'asOf') {
    return (
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-asof">{t.reports.asOfLabel}</Label>
          <Input id="r-asof" type="date" aria-label={t.reports.asOfLabel} value={asOf} onChange={(e) => onAsOf?.(e.target.value)} />
        </div>
      </div>
    );
  }
  const valid = isRangeValid(from, to);
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="r-from">{t.reports.from}</Label>
        <Input id="r-from" type="date" aria-label={t.reports.from} value={from} onChange={(e) => onRange?.(e.target.value, to)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-to">{t.reports.to}</Label>
        <Input id="r-to" type="date" aria-label={t.reports.to} value={to} onChange={(e) => onRange?.(from, e.target.value)} />
      </div>
      {!valid ? <p className="text-xs text-destructive">{t.reports.rangeInvalid}</p> : null}
    </div>
  );
}
