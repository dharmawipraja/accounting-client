import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const salesInvoiceLineSchema = z.object({
  id: z.string(),
  lineNo: z.number(),
  description: z.string(),
  accountId: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxCodeIds: z.array(z.string()),
});
export type SalesInvoiceLine = z.infer<typeof salesInvoiceLineSchema>;

export const salesInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.number().nullish(),
  invoiceRef: z.string().nullish(),
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
  lines: z.array(salesInvoiceLineSchema).default([]), // omitted from list responses
});
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;

const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const invoiceLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type InvoiceLineFormValues = z.infer<typeof invoiceLineFormSchema>;

export const invoiceFormSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  description: z.string(),
  lines: z.array(invoiceLineFormSchema).min(1, 'atLeastOneLine'),
});
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export type SalesInvoiceCreatePayload = {
  partnerId: string;
  date: string;
  dueDate?: string;
  description?: string;
  lines: {
    description: string;
    accountId: string;
    quantity: string;
    unitPrice: string;
    taxCodeIds: string[];
  }[];
};
export type SalesInvoiceUpdatePayload = Partial<SalesInvoiceCreatePayload>;
