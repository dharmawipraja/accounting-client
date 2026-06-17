import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
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

  return (
    <QueryState
      query={item}
      loading={<SkeletonForm fields={6} />}
      onRetry
      notFound={
        <NotFound
          title={t.notFound.recordTitle}
          message={t.notFound.recordMessage}
          action={<Button onClick={goList}>{t.notFound.backToList}</Button>}
        />
      }
    >
      {(data) => {
        const readOnly = data.status !== 'DRAFT';
        return (
          <div>
            <PageHeader title={readOnly ? t.payments.view : t.payments.editPayment} />
            <PaymentForm mode="edit" payment={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
