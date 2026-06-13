import { createFileRoute } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';
export const Route = createFileRoute('/_app/payments/new')({
  component: function NewPaymentRoute() { return <PaymentEditorPage />; },
});
