import { useMemo } from 'react';
import { Money } from '@/lib/money/money';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import type { SalesInvoice } from '@/features/sales-invoices/schema';

/** Open invoices for a partner: POSTED + outstanding>0 (+ partner if given), sorted by date. */
export function useOpenInvoices(partnerId?: string): SalesInvoice[] {
  const list = salesInvoicesApi.useList();
  return useMemo(
    () =>
      (list.data ?? [])
        .filter((inv) => inv.status === 'POSTED'
          && Money.from(inv.outstanding).gt(Money.zero())
          && (!partnerId || inv.partnerId === partnerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [list.data, partnerId],
  );
}
