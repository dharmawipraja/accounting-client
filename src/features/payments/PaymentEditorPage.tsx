import { useNavigate } from '@tanstack/react-router';
import { BackLink } from '@/components/common/BackLink';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { PaymentForm } from './PaymentForm';
import { paymentsApi } from './hooks';

export function PaymentEditorPage({ id, direction = 'RECEIPT' }: { id?: string; direction?: 'RECEIPT' | 'DISBURSEMENT' }) {
  const t = useT();
  const navigate = useNavigate();
  const createTitle = direction === 'DISBURSEMENT' ? t.payments.newDisbursementTitle : t.payments.newReceiptTitle;
  return (
    <DocumentEditorPage
      id={id}
      config={{
        useItem: paymentsApi.useItem,
        onDone: () => navigate({ to: '/payments' }),
        back: <BackLink to="/payments" label={t.nav.payments} />,
        titles: { create: createTitle, edit: t.payments.editPayment, view: t.payments.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <PaymentForm mode={mode} payment={doc} direction={direction} onSaved={onSaved} readOnly={readOnly} />
        ),
      }}
    />
  );
}
