import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import { paymentSchema, type Payment, type PaymentCreatePayload } from './schema';

// No TUpdate: the API has no payment update endpoint (create/post/void/delete only).
export const paymentsApi = createDocumentHooks<Payment, PaymentCreatePayload, never>({
  keys: queryKeys.payments,
  basePath: '/payments',
  itemSchema: paymentSchema,
  paginated: true,
});

// Posting/voiding a payment changes the allocated invoices'/bills' outstanding,
// amountPaid and paymentStatus server-side, and writes a journal entry — their
// caches must not keep serving pre-payment balances (useOpenDocuments validates
// allocations against them).
const PAYMENT_SIDE_EFFECTS = [
  queryKeys.salesInvoices.all,
  queryKeys.purchaseBills.all,
  queryKeys.journalEntries.all,
] as const;

export const usePostPayment = () => paymentsApi.useAction('post', PAYMENT_SIDE_EFFECTS);
export const useVoidPayment = () => paymentsApi.useAction('void', PAYMENT_SIDE_EFFECTS);
