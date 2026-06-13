import { createFileRoute } from '@tanstack/react-router';
import { SalesInvoicesPage } from '@/features/sales-invoices/SalesInvoicesPage';

export const Route = createFileRoute('/_app/sales-invoices/')({
  component: SalesInvoicesPage,
});
