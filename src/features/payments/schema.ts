import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const paymentAllocationSchema = z.object({
  id: z.string().optional(),
  salesInvoiceId: z.string().nullish(),
  purchaseBillId: z.string().nullish(),
  amount: moneyString,
});
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  paymentNumber: z.number().nullish(),
  paymentRef: z.string().nullish(),
  direction: z.enum(['RECEIPT', 'DISBURSEMENT']),
  partnerId: z.string(),
  date: z.string(),
  cashAccountId: z.string(),
  description: z.string().nullish(),
  status: z.string(),
  total: moneyString.nullish(),
  journalEntryId: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  allocations: z.array(paymentAllocationSchema),
});
export type Payment = z.infer<typeof paymentSchema>;

export type PaymentCreatePayload = {
  direction: 'RECEIPT';
  partnerId: string;
  date: string;
  cashAccountId: string;
  description?: string;
  allocations: { salesInvoiceId: string; amount: string }[];
};
export type PaymentUpdatePayload = Partial<PaymentCreatePayload>;
export type PaymentHeaderValues = { partnerId: string; date: string; cashAccountId: string; description: string };
