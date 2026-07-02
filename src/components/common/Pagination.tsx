import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

interface BaseProps {
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
}

/** Offset pager with two modes over one concept:
 *  - `total` known  → "showing from–to of total" label; Next off at `offset+limit >= total`.
 *  - `total` absent → no label; Next off when the page is short (`count < limit`),
 *    for endpoints that return a bare array with no total (e.g. the audit log). */
type PaginationProps = BaseProps & ({ total: number; count?: never } | { total?: undefined; count: number });

export function Pagination({ offset, limit, onChange, total, count }: PaginationProps) {
  const t = useT();
  const hasTotal = total !== undefined;
  const nextDisabled = hasTotal ? offset + limit >= total : (count ?? 0) < limit;
  const label = hasTotal
    ? t.common.paginationShowing
        .replace('{from}', String(total === 0 ? 0 : offset + 1))
        .replace('{to}', String(Math.min(offset + limit, total)))
        .replace('{total}', String(total))
    : null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      {label ? <span className="text-muted-foreground">{label}</span> : <span />}
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" disabled={offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          {t.common.prev}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={nextDisabled} onClick={() => onChange(offset + limit)}>
          {t.common.next}
        </Button>
      </div>
    </div>
  );
}
