import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

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

const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const billLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type BillLineFormValues = z.infer<typeof billLineFormSchema>;

export const billFormSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  vendorInvoiceNo: z.string(),
  description: z.string(),
  lines: z.array(billLineFormSchema).min(1, 'atLeastOneLine'),
});
export type BillFormValues = z.infer<typeof billFormSchema>;

export type PurchaseBillCreatePayload = {
  partnerId: string;
  date: string;
  dueDate?: string;
  vendorInvoiceNo?: string;
  description?: string;
  lines: { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] }[];
};
export type PurchaseBillUpdatePayload = Partial<PurchaseBillCreatePayload>;
