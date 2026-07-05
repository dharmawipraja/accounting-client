import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';
import { documentLineFormSchema, documentHeaderSchema, type DocumentLineFormValues } from '@/features/documents/documentFormSchema';

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

export const invoiceLineFormSchema = documentLineFormSchema;
export type InvoiceLineFormValues = DocumentLineFormValues;

export const invoiceFormSchema = documentHeaderSchema;
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
// UpdateSalesInvoiceDto accepts no partnerId: the partner is fixed once created.
export type SalesInvoiceUpdatePayload = Partial<Omit<SalesInvoiceCreatePayload, 'partnerId'>>;
