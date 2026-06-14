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

function isOpen(r: { status: string; outstanding: string; partnerId: string }, partnerId?: string): boolean {
  return r.status === 'POSTED' && Money.from(r.outstanding).gt(Money.zero()) && (!partnerId || r.partnerId === partnerId);
}

const toInvoiceDoc = (inv: SalesInvoice): OpenDocument => ({ id: inv.id, ref: inv.invoiceRef ?? null, dueDate: inv.dueDate ?? null, outstanding: inv.outstanding });
const toBillDoc = (bill: PurchaseBill): OpenDocument => ({ id: bill.id, ref: bill.billRef ?? null, dueDate: bill.dueDate ?? null, outstanding: bill.outstanding });

/** Open documents to allocate a payment against:
 *  RECEIPT → POSTED sales invoices; DISBURSEMENT → POSTED purchase bills.
 *  Filtered to outstanding>0 (+ partner if given), sorted by date. */
export function useOpenDocuments(direction: 'RECEIPT' | 'DISBURSEMENT', partnerId?: string): OpenDocument[] {
  const invoices = salesInvoicesApi.useList();
  const bills = purchaseBillsApi.useList();
  return useMemo(() => {
    if (direction === 'RECEIPT') {
      return (invoices.data ?? []).filter((r) => isOpen(r, partnerId)).sort((a, b) => a.date.localeCompare(b.date)).map(toInvoiceDoc);
    }
    return (bills.data ?? []).filter((r) => isOpen(r, partnerId)).sort((a, b) => a.date.localeCompare(b.date)).map(toBillDoc);
  }, [direction, partnerId, invoices.data, bills.data]);
}
