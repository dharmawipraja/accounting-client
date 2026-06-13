import { createFileRoute } from '@tanstack/react-router';
import { InvoiceEditorPage } from '@/features/sales-invoices/InvoiceEditorPage';

export const Route = createFileRoute('/_app/sales-invoices/new')({
  component: function NewInvoiceRoute() {
    return <InvoiceEditorPage />;
  },
});
