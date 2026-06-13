import { createFileRoute, useParams } from '@tanstack/react-router';
import { InvoiceEditorPage } from '@/features/sales-invoices/InvoiceEditorPage';

export const Route = createFileRoute('/_app/sales-invoices/$id/edit')({
  component: function EditInvoiceRoute() {
    const { id } = useParams({ from: '/_app/sales-invoices/$id/edit' });
    return <InvoiceEditorPage id={id} />;
  },
});
