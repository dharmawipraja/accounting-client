import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

export function OffsetPager({ offset, limit, count, onChange }: { offset: number; limit: number; count: number; onChange: (offset: number) => void }) {
  const t = useT();
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>{t.audit.prev}</Button>
      <Button type="button" variant="outline" size="sm" disabled={count < limit} onClick={() => onChange(offset + limit)}>{t.audit.next}</Button>
    </div>
  );
}
