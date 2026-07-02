import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import { paymentSchema, type Payment, type PaymentCreatePayload, type PaymentUpdatePayload } from './schema';

export const paymentsApi = createDocumentHooks<Payment, PaymentCreatePayload, PaymentUpdatePayload>({
  keys: queryKeys.payments,
  basePath: '/payments',
  itemSchema: paymentSchema,
  paginated: true,
});

export const usePostPayment = () => paymentsApi.useAction('post');
export const useVoidPayment = () => paymentsApi.useAction('void');
