import { z } from 'zod';
import { Money } from '@/lib/money/money';

export const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const documentLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type DocumentLineFormValues = z.infer<typeof documentLineFormSchema>;

export const documentHeaderSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  description: z.string(),
  lines: z.array(documentLineFormSchema).min(1, 'atLeastOneLine'),
});
export type DocumentHeaderValues = z.infer<typeof documentHeaderSchema>;

export const EMPTY_LINE: DocumentLineFormValues = {
  description: '', accountId: '', quantity: '1', unitPrice: '', taxCodeIds: [],
};

export function safeAmount(qty: string, price: string): string {
  try {
    return Money.from(qty || '0').times(price || '0').toApi();
  } catch {
    return '0';
  }
}
