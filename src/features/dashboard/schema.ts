import { z } from 'zod';

/** The dashboard's draft-journal count reads only the list envelope's `total`.
 *  The three financial statements reuse `@/features/reports/schema`. */
export const draftCountSchema = z.object({ total: z.number() });
export type DraftCount = z.infer<typeof draftCountSchema>;
