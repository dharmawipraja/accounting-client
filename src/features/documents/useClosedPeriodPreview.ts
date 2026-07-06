import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { queryKeys } from '@/lib/query/keys';
import type { TaxPreviewLine } from './useTaxPreview';

interface Args {
  nature: 'SALE' | 'PURCHASE';
  settlementAccountId?: string;
  lines: TaxPreviewLine[];
  date: string;
}

export type ClosedPeriodResult = { closed: boolean; kind?: 'period' | 'year' };

/** Warns at edit time when the document's date falls in a closed period or
 *  fiscal year, by asking the read-only journal-entry preview to reproduce the
 *  409 a real post would give (guide: the preview `date` param exists to catch
 *  CLOSED_PERIOD / CLOSED_YEAR before post time — payments already do this).
 *
 *  Keyed on the DATE only: the period status is amount-independent, so editing
 *  line amounts must not refire it (only a date change does). Any non-409 error
 *  is treated as "not closed" so a transient failure never shows a false warning. */
export function useClosedPeriodPreview({ nature, settlementAccountId, lines, date }: Args): ClosedPeriodResult {
  const debouncedDate = useDebouncedValue(date, 400);
  const completeLines = lines.filter((l) => l.accountId && l.amount && Number(l.amount) > 0);
  const enabled = !!debouncedDate && !!settlementAccountId && completeLines.length > 0;

  const query = useQuery<ClosedPeriodResult>({
    queryKey: queryKeys.closedPeriodPreview(nature, debouncedDate),
    enabled,
    retry: false,
    queryFn: async () => {
      try {
        await apiFetch('/journal-entries/preview', {
          method: 'POST',
          body: { nature, settlementAccountId, date: debouncedDate, lines: completeLines },
        });
        return { closed: false };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          if (err.code === 'CLOSED_PERIOD') return { closed: true, kind: 'period' };
          if (err.code === 'CLOSED_YEAR') return { closed: true, kind: 'year' };
        }
        return { closed: false }; // other errors surface elsewhere; never warn spuriously
      }
    },
  });

  return query.data ?? { closed: false };
}
