import { useMemo } from 'react';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import { purchaseBillsApi } from '@/features/purchase-bills/hooks';
import { paymentsApi } from '@/features/payments/hooks';
import { useJournalEntries } from '@/features/journals/hooks';
import { partnersApi } from '@/features/partners/hooks';
import { useEntityLabelMap } from '@/lib/hooks/useEntityLabelMap';
import type { SalesInvoice } from '@/features/sales-invoices/schema';
import type { PurchaseBill } from '@/features/purchase-bills/schema';
import type { Payment } from '@/features/payments/schema';
import type { JournalEntryListItem } from '@/features/journals/schema';

export type ApprovalKind = 'invoice' | 'bill' | 'payment' | 'journal';

export interface ApprovalItem {
  kind: ApprovalKind;
  id: string;
  ref: string | null;
  subtitle: string; // partner name or journal description
  date: string;
  amount: string;
}

const LIMIT = 200;

/** Aggregates every DRAFT document (sales invoices, purchase bills, payments,
 *  journals) into one approval inbox, oldest-first. Each resource is queried
 *  with ?status=DRAFT (the guide's documented approval queue). */
export function useApprovalQueue() {
  const invoices = salesInvoicesApi.usePagedList({ status: 'DRAFT', limit: LIMIT });
  const bills = purchaseBillsApi.usePagedList({ status: 'DRAFT', limit: LIMIT });
  const payments = paymentsApi.usePagedList({ status: 'DRAFT', limit: LIMIT });
  const journals = useJournalEntries({ status: 'DRAFT', limit: LIMIT, offset: 0 });
  const partnerName = useEntityLabelMap(partnersApi.useList, (p) => p.name);

  const queries = [invoices, bills, payments, journals];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const items = useMemo<ApprovalItem[]>(() => {
    const inv = (invoices.data?.data ?? []) as SalesInvoice[];
    const bl = (bills.data?.data ?? []) as PurchaseBill[];
    const pm = (payments.data?.data ?? []) as Payment[];
    const je = (journals.data?.data ?? []) as JournalEntryListItem[];
    const all: ApprovalItem[] = [
      ...inv.map((d) => ({ kind: 'invoice' as const, id: d.id, ref: d.invoiceRef ?? null, subtitle: partnerName(d.partnerId), date: d.date, amount: d.total })),
      ...bl.map((d) => ({ kind: 'bill' as const, id: d.id, ref: d.billRef ?? null, subtitle: partnerName(d.partnerId), date: d.date, amount: d.total })),
      ...pm.map((d) => ({ kind: 'payment' as const, id: d.id, ref: d.ref ?? null, subtitle: partnerName(d.partnerId), date: d.date, amount: d.amount ?? '0' })),
      ...je.map((d) => ({ kind: 'journal' as const, id: d.id, ref: d.entryRef ?? null, subtitle: d.description ?? '', date: d.date, amount: d.totalDebit })),
    ];
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices.data, bills.data, payments.data, journals.data, partnerName]);

  return { items, isLoading, isError, error };
}
