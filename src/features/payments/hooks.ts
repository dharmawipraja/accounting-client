import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { paymentSchema, type Payment, type PaymentCreatePayload, type PaymentUpdatePayload } from './schema';

export const paymentsApi = createResourceHooks<Payment, PaymentCreatePayload, PaymentUpdatePayload>({
  key: 'payments',
  basePath: '/payments',
  itemSchema: paymentSchema,
});

export const usePostPayment = () => useDocumentAction({ key: 'payments', basePath: '/payments', action: 'post' });
export const useVoidPayment = () => useDocumentAction({ key: 'payments', basePath: '/payments', action: 'void' });
