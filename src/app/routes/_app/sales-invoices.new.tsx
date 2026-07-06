import { createFileRoute } from '@tanstack/react-router';
import { InvoiceEditorPage } from '@/features/sales-invoices/InvoiceEditorPage';

export const Route = createFileRoute('/_app/sales-invoices/new')({
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    (typeof search.from === 'string' && search.from ? { from: search.from } : {}),
  component: function NewInvoiceRoute() {
    const { from } = Route.useSearch();
    return <InvoiceEditorPage duplicateFromId={from} />;
  },
});
