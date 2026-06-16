import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { InvoiceForm } from './InvoiceForm';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/sales-invoices' });
  const item = salesInvoicesApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.salesInvoices.newInvoice} />
        <InvoiceForm mode="create" onSaved={goList} />
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
            <PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} />
            <InvoiceForm mode="edit" invoice={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
