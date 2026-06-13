import { createFileRoute, useParams } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';
export const Route = createFileRoute('/_app/payments/$id/edit')({
  component: function EditPaymentRoute() {
    const { id } = useParams({ from: '/_app/payments/$id/edit' });
    return <PaymentEditorPage id={id} />;
  },
});
