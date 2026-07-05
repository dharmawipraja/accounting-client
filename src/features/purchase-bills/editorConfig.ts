import { useT } from '@/lib/i18n/useT';
import { EMPTY_LINE } from '@/features/documents/documentFormSchema';
import type { DocumentEditorConfig, DocumentEditorLabels } from '@/features/documents/DocumentEditor';
import { purchaseBillsApi } from './hooks';
import { billFormSchema, type BillFormValues, type PurchaseBill, type PurchaseBillCreatePayload } from './schema';

export function useBillEditorConfig(): DocumentEditorConfig<PurchaseBill, BillFormValues, PurchaseBillCreatePayload> {
  const t = useT();
  const labels: DocumentEditorLabels = {
    partner: t.purchaseBills.partner, selectPartner: t.purchaseBills.selectPartner, date: t.purchaseBills.date,
    dueDate: t.purchaseBills.dueDate, description: t.purchaseBills.description, vendorInvoiceNo: t.purchaseBills.vendorInvoiceNo,
    lineDescription: t.purchaseBills.lineDescription, account: t.purchaseBills.account, selectAccount: t.purchaseBills.selectAccount,
    quantity: t.purchaseBills.quantity, unitPrice: t.purchaseBills.unitPrice, taxes: t.purchaseBills.taxes, lineAmount: t.purchaseBills.lineAmount,
    addLine: t.purchaseBills.addLine, removeLine: t.purchaseBills.removeLine, atLeastOneLine: t.purchaseBills.atLeastOneLine,
    required: t.purchaseBills.required, saveDraft: t.purchaseBills.saveDraft, readOnlyPosted: t.purchaseBills.readOnlyPosted, readOnlyVoid: t.purchaseBills.readOnlyVoid,
  };
  return {
    nature: 'PURCHASE',
    settlementAccountCode: '2-1000',
    allowedTaxKinds: ['PPN_INPUT', 'PPH_PAYABLE'],
    partnerFilter: 'vendor',
    formSchema: billFormSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', vendorInvoiceNo: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (bill) => ({
      partnerId: bill.partnerId,
      date: bill.date.slice(0, 10),
      dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : '',
      vendorInvoiceNo: bill.vendorInvoiceNo ?? '',
      description: bill.description ?? '',
      lines: bill.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    toPayload: (v) => ({
      partnerId: v.partnerId,
      date: v.date,
      dueDate: v.dueDate || undefined,
      vendorInvoiceNo: v.vendorInvoiceNo || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    // UpdatePurchaseBillDto: {date, dueDate, vendorInvoiceNo, description, lines} — no partnerId.
    toUpdatePayload: (v) => ({
      date: v.date,
      dueDate: v.dueDate || undefined,
      vendorInvoiceNo: v.vendorInvoiceNo || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    create: purchaseBillsApi.useCreate(),
    update: purchaseBillsApi.useUpdate(),
    labels,
    docRef: (bill) => bill.billRef,
    extraHeaderField: { name: 'vendorInvoiceNo', label: t.purchaseBills.vendorInvoiceNo, inputId: 'vinv' },
  };
}
