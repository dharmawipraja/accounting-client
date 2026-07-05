import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';
import { documentLineFormSchema, documentHeaderSchema, type DocumentLineFormValues } from '@/features/documents/documentFormSchema';

export const purchaseBillLineSchema = z.object({
  id: z.string(),
  purchaseBillId: z.string().nullish(),
  lineNo: z.number(),
  description: z.string(),
  accountId: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxCodeIds: z.array(z.string()),
});
export type PurchaseBillLine = z.infer<typeof purchaseBillLineSchema>;

export const purchaseBillSchema = z.object({
  id: z.string(),
  billNumber: z.number().nullish(),
  billRef: z.string().nullish(),
  fiscalYear: z.number().nullish(),
  vendorInvoiceNo: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  journalEntryId: z.string().nullish(),
  partnerId: z.string(),
  date: z.string(),
  dueDate: z.string().nullish(),
  description: z.string().nullish(),
  status: z.string(),
  subtotal: moneyString,
  taxTotal: moneyString,
  withholdingTotal: moneyString,
  total: moneyString,
  amountPaid: moneyString,
  outstanding: moneyString,
  paymentStatus: z.string().nullish(),
  lines: z.array(purchaseBillLineSchema).default([]), // omitted from list responses
});
export type PurchaseBill = z.infer<typeof purchaseBillSchema>;

export const billLineFormSchema = documentLineFormSchema;
export type BillLineFormValues = DocumentLineFormValues;

export const billFormSchema = documentHeaderSchema.extend({ vendorInvoiceNo: z.string() });
export type BillFormValues = z.infer<typeof billFormSchema>;

export type PurchaseBillCreatePayload = {
  partnerId: string;
  date: string;
  dueDate?: string;
  vendorInvoiceNo?: string;
  description?: string;
  lines: { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] }[];
};
// UpdatePurchaseBillDto accepts no partnerId: the partner is fixed once created.
export type PurchaseBillUpdatePayload = Partial<Omit<PurchaseBillCreatePayload, 'partnerId'>>;
