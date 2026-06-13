import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { taxCalcSchema, type TaxCalc } from './taxCalcSchema';

export type TaxPreviewLine = { accountId: string; amount: string; taxCodeIds: string[] };

interface Args {
  nature: 'SALE' | 'PURCHASE';
  settlementAccountId?: string;
  lines: TaxPreviewLine[];
}

export function useTaxPreview(args: Args): { data?: TaxCalc; isLoading: boolean; error: ApiError | null } {
  const debounced = useDebouncedValue(JSON.stringify(args), 400);
  const parsed = JSON.parse(debounced) as Args;

  const completeLines = parsed.lines.filter(
    (l) => l.accountId && l.amount && Number(l.amount) > 0,
  );
  const enabled = !!parsed.settlementAccountId && completeLines.length > 0;

  const query = useQuery<TaxCalc, ApiError>({
    queryKey: ['taxCalc', debounced],
    enabled,
    queryFn: () =>
      apiFetch('/tax/calculate', {
        method: 'POST',
        body: { nature: parsed.nature, settlementAccountId: parsed.settlementAccountId, lines: completeLines },
        schema: taxCalcSchema,
      }),
  });

  return { data: query.data, isLoading: query.isFetching, error: (query.error as ApiError) ?? null };
}
