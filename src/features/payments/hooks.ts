import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';
import { paymentSchema, type Payment, type PaymentCreatePayload, type PaymentUpdatePayload } from './schema';

export const paymentsApi = createDocumentHooks<Payment, PaymentCreatePayload, PaymentUpdatePayload>({
  keys: queryKeys.payments,
  basePath: '/payments',
  itemSchema: paymentSchema,
  paginated: true,
});

export const usePostPayment = () => useDocumentAction({ keys: queryKeys.payments, basePath: '/payments', action: 'post' });
export const useVoidPayment = () => useDocumentAction({ keys: queryKeys.payments, basePath: '/payments', action: 'void' });
