import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

interface Props {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}

export function Pagination({ offset, limit, total, onChange }: Props) {
  const t = useT();
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const label = t.common.paginationShowing
    .replace('{from}', String(from))
    .replace('{to}', String(to))
    .replace('{total}', String(total));
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" disabled={offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          {t.common.prev}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
          {t.common.next}
        </Button>
      </div>
    </div>
  );
}
