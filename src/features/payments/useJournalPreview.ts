import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { moneyString } from '@/lib/schemas/common';
import { queryKeys } from '@/lib/query/keys';
import type { PaymentAllocationInput } from './schema';

export const journalPreviewSchema = z.object({
  lines: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      debit: moneyString,
      credit: moneyString,
    }),
  ),
});
export type JournalPreview = z.infer<typeof journalPreviewSchema>;

interface Args {
  direction: 'RECEIPT' | 'DISBURSEMENT';
  cashAccountId: string;
  /** The payment's date; sending it reproduces a closed-period 409 at preview
   *  time instead of at post time (guide §journal-entry preview). */
  date: string;
  allocations: PaymentAllocationInput[];
}

/** Read-only dry run of the balanced journal a payment WOULD post
 *  (POST /journal-entries/preview, nature PAYMENT — distinct from the manual-
 *  journal CRUD at /ledger/journal-entries). Debounced like useTaxPreview. */
export function useJournalPreview(args: Args): { data?: JournalPreview; isLoading: boolean; error: ApiError | null } {
  const debounced = useDebouncedValue(JSON.stringify(args), 400);
  const parsed = JSON.parse(debounced) as Args;
  const enabled = !!parsed.cashAccountId && parsed.allocations.length > 0;

  const query = useQuery<JournalPreview, ApiError>({
    queryKey: queryKeys.journalPreview(debounced),
    enabled,
    queryFn: () =>
      apiFetch('/journal-entries/preview', {
        method: 'POST',
        body: {
          nature: 'PAYMENT',
          direction: parsed.direction,
          cashAccountId: parsed.cashAccountId,
          date: parsed.date || undefined,
          allocations: parsed.allocations,
        },
        schema: journalPreviewSchema,
      }),
  });

  return { data: query.data, isLoading: query.isFetching, error: (query.error as ApiError) ?? null };
}
