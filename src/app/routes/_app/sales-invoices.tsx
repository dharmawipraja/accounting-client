import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/sales-invoices')({
  component: function SalesInvoicesRoute() {
    return <PageHeader title={useT().nav.salesInvoices} />;
  },
});
