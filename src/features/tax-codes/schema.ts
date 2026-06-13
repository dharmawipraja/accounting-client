import { z } from 'zod';

export const taxKindSchema = z.enum(['PPN_OUTPUT', 'PPN_INPUT', 'PPH_PAYABLE', 'PPH_PREPAID']);
export type TaxKind = z.infer<typeof taxKindSchema>;

export const taxCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: taxKindSchema,
  rate: z.string(),
  taxAccountId: z.string(),
  isActive: z.boolean(),
});
export type TaxCode = z.infer<typeof taxCodeSchema>;

// Create form: percent input (ratePercent), converted to a fraction on submit.
export const taxCodeCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: taxKindSchema,
  ratePercent: z.string().regex(/^\d+(\.\d+)?$/, 'invalidRate'),
  taxAccountId: z.string().min(1, 'selectAccount'),
});
export type TaxCodeCreateValues = z.infer<typeof taxCodeCreateSchema>;

export const taxCodeEditSchema = z.object({
  name: z.string().min(1),
  ratePercent: z.string().regex(/^\d+(\.\d+)?$/, 'invalidRate'),
  isActive: z.boolean(),
});
export type TaxCodeEditValues = z.infer<typeof taxCodeEditSchema>;

// API payloads (rate as a fraction string).
export type TaxCodeCreatePayload = { code: string; name: string; kind: TaxKind; rate: string; taxAccountId: string };
export type TaxCodeUpdatePayload = { name: string; rate: string; isActive: boolean };
