import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';
import { PaymentForm } from './PaymentForm';
import { paymentsApi } from './hooks';

export function PaymentEditorPage({ id, direction = 'RECEIPT' }: { id?: string; direction?: 'RECEIPT' | 'DISBURSEMENT' }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/payments' });
  const item = paymentsApi.useItem(id ?? '');

  if (!id) {
    const title = direction === 'DISBURSEMENT' ? t.payments.newDisbursementTitle : t.payments.newReceiptTitle;
    return <div><PageHeader title={title} /><PaymentForm mode="create" direction={direction} onSaved={goList} /></div>;
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const readOnly = item.data.status !== 'DRAFT';
  return (
    <div>
      <PageHeader title={readOnly ? t.payments.view : t.payments.editPayment} />
      <PaymentForm mode="edit" payment={item.data} onSaved={goList} readOnly={readOnly} />
    </div>
  );
}
