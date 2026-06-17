import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { BackLink } from '@/components/common/BackLink';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { BillForm } from './BillForm';
import { purchaseBillsApi } from './hooks';

export function BillEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/purchase-bills' });
  const item = purchaseBillsApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.purchaseBills.newBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
        <BillForm mode="create" onSaved={goList} />
      </div>
    );
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
            <PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
            <BillForm mode="edit" bill={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
