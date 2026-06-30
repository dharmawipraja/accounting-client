import type { Messages } from '@/lib/i18n/messages.id';

export type JournalSourceType =
  | 'MANUAL' | 'OPENING' | 'REVERSAL' | 'SALES_INVOICE' | 'PURCHASE_BILL' | 'PAYMENT' | 'CLOSING';

const SOURCE_LABEL_KEY: Record<JournalSourceType, keyof Messages['journals']> = {
  MANUAL: 'sourceManual',
  OPENING: 'sourceOpening',
  REVERSAL: 'sourceReversal',
  SALES_INVOICE: 'sourceSale',
  PURCHASE_BILL: 'sourcePurchase',
  PAYMENT: 'sourcePayment',
  CLOSING: 'sourceClosing',
};

/** Label a journal source. Accepts the raw API string; unknown values pass
 *  through unchanged (older data tolerance). The map is exhaustive over the
 *  documented API enum. */
export function journalSourceLabel(t: Messages, source: string): string {
  const key = SOURCE_LABEL_KEY[source as JournalSourceType];
  return key ? (t.journals[key] as string) : source;
}
