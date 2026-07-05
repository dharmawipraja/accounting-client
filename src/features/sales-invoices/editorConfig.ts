import { useT } from '@/lib/i18n/useT';
import { EMPTY_LINE } from '@/features/documents/documentFormSchema';
import type { DocumentEditorConfig, DocumentEditorLabels } from '@/features/documents/DocumentEditor';
import { salesInvoicesApi } from './hooks';
import { invoiceFormSchema, type InvoiceFormValues, type SalesInvoice, type SalesInvoiceCreatePayload } from './schema';

export function useInvoiceEditorConfig(): DocumentEditorConfig<SalesInvoice, InvoiceFormValues, SalesInvoiceCreatePayload> {
  const t = useT();
  const labels: DocumentEditorLabels = {
    partner: t.salesInvoices.partner, selectPartner: t.salesInvoices.selectPartner, date: t.salesInvoices.date,
    dueDate: t.salesInvoices.dueDate, description: t.salesInvoices.description, vendorInvoiceNo: '',
    lineDescription: t.salesInvoices.lineDescription, account: t.salesInvoices.account, selectAccount: t.salesInvoices.selectAccount,
    quantity: t.salesInvoices.quantity, unitPrice: t.salesInvoices.unitPrice, taxes: t.salesInvoices.taxes, lineAmount: t.salesInvoices.lineAmount,
    addLine: t.salesInvoices.addLine, removeLine: t.salesInvoices.removeLine, atLeastOneLine: t.salesInvoices.atLeastOneLine,
    required: t.salesInvoices.required, saveDraft: t.salesInvoices.saveDraft, readOnlyPosted: t.salesInvoices.readOnlyPosted, readOnlyVoid: t.salesInvoices.readOnlyVoid,
  };
  return {
    nature: 'SALE',
    settlementAccountCode: '1-1200',
    allowedTaxKinds: ['PPN_OUTPUT', 'PPH_PREPAID'],
    partnerFilter: 'customer',
    formSchema: invoiceFormSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (inv) => ({
      partnerId: inv.partnerId,
      date: inv.date.slice(0, 10),
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      description: inv.description ?? '',
      lines: inv.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    toPayload: (v) => ({
      partnerId: v.partnerId,
      date: v.date,
      dueDate: v.dueDate || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    // UpdateSalesInvoiceDto: {date, dueDate, description, lines} — no partnerId.
    toUpdatePayload: (v) => ({
      date: v.date,
      dueDate: v.dueDate || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    create: salesInvoicesApi.useCreate(),
    update: salesInvoicesApi.useUpdate(),
    labels,
    docRef: (inv) => inv.invoiceRef,
  };
}
