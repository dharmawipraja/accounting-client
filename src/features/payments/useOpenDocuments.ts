import { useMemo } from 'react';
import { Money } from '@/lib/money/money';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import type { SalesInvoice } from '@/features/sales-invoices/schema';
import { purchaseBillsApi } from '@/features/purchase-bills/hooks';
import type { PurchaseBill } from '@/features/purchase-bills/schema';

export interface OpenDocument {
  id: string;
  ref: string | null;
  dueDate: string | null;
  outstanding: string;
}

/** The API's per-request page cap. Filtered to one partner's POSTED documents,
 *  a page this size is effectively never exceeded in practice. */
const OPEN_DOCS_LIMIT = 200;

const hasOutstanding = (r: { outstanding: string }) => Money.from(r.outstanding).gt(Money.zero());
const toInvoiceDoc = (inv: SalesInvoice): OpenDocument => ({ id: inv.id, ref: inv.invoiceRef ?? null, dueDate: inv.dueDate ?? null, outstanding: inv.outstanding });
const toBillDoc = (bill: PurchaseBill): OpenDocument => ({ id: bill.id, ref: bill.billRef ?? null, dueDate: bill.dueDate ?? null, outstanding: bill.outstanding });

/** Open documents to allocate a payment against:
 *  RECEIPT → POSTED sales invoices; DISBURSEMENT → POSTED purchase bills.
 *  status + partner are server-side query params (so open documents are found
 *  even past the first 200 rows of the unfiltered list); outstanding>0 stays
 *  client-side (no server param for it). No fetch until a partner is chosen. */
export function useOpenDocuments(direction: 'RECEIPT' | 'DISBURSEMENT', partnerId?: string): OpenDocument[] {
  const query = { status: 'POSTED', partnerId, limit: OPEN_DOCS_LIMIT };
  const invoices = salesInvoicesApi.usePagedList(query, { enabled: !!partnerId && direction === 'RECEIPT' });
  const bills = purchaseBillsApi.usePagedList(query, { enabled: !!partnerId && direction === 'DISBURSEMENT' });
  return useMemo(() => {
    if (!partnerId) return [];
    if (direction === 'RECEIPT') {
      return (invoices.data?.data ?? []).filter(hasOutstanding).sort((a, b) => a.date.localeCompare(b.date)).map(toInvoiceDoc);
    }
    return (bills.data?.data ?? []).filter(hasOutstanding).sort((a, b) => a.date.localeCompare(b.date)).map(toBillDoc);
  }, [direction, partnerId, invoices.data, bills.data]);
}
