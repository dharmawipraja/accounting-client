import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { BackLink } from '@/components/common/BackLink';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useInvoiceEditorConfig } from './editorConfig';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/sales-invoices' });
  const config = useInvoiceEditorConfig();
  const item = salesInvoicesApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.salesInvoices.newInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
        <DocumentEditor config={config} mode="create" onSaved={goList} />
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
            <PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
            <DocumentEditor config={config} mode="edit" doc={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
