import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const taxCalcSchema = z.object({
  subtotal: moneyString,
  taxes: z.array(z.object({
    taxCodeId: z.string(), code: z.string(), kind: z.string(),
    base: moneyString, amount: moneyString, accountId: z.string(),
  })),
  settlementAmount: moneyString,
  journalLines: z.array(z.object({ accountId: z.string(), debit: moneyString.optional(), credit: moneyString.optional() })),
});
export type TaxCalc = z.infer<typeof taxCalcSchema>;
