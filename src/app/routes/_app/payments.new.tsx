import { createFileRoute } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';

type NewPaymentSearch = { direction: 'RECEIPT' | 'DISBURSEMENT' };

export const Route = createFileRoute('/_app/payments/new')({
  validateSearch: (search: Record<string, unknown>): NewPaymentSearch => ({
    direction: search.direction === 'DISBURSEMENT' ? 'DISBURSEMENT' : 'RECEIPT',
  }),
  component: function NewPaymentRoute() {
    const { direction } = Route.useSearch();
    return <PaymentEditorPage direction={direction} />;
  },
});
