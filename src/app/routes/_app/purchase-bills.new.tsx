import { createFileRoute } from '@tanstack/react-router';
import { BillEditorPage } from '@/features/purchase-bills/BillEditorPage';

export const Route = createFileRoute('/_app/purchase-bills/new')({
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    (typeof search.from === 'string' && search.from ? { from: search.from } : {}),
  component: function NewBillRoute() {
    const { from } = Route.useSearch();
    return <BillEditorPage duplicateFromId={from} />;
  },
});
