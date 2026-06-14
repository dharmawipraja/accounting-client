import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
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
        <PageHeader title={t.purchaseBills.newBill} />
        <BillForm mode="create" onSaved={goList} />
      </div>
    );
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const readOnly = item.data.status !== 'DRAFT';
  return (
    <div>
      <PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} />
      <BillForm mode="edit" bill={item.data} onSaved={goList} readOnly={readOnly} />
    </div>
  );
}
