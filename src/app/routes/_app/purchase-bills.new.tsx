import { createFileRoute } from '@tanstack/react-router';
import { BillEditorPage } from '@/features/purchase-bills/BillEditorPage';

export const Route = createFileRoute('/_app/purchase-bills/new')({
  component: function NewBillRoute() {
    return <BillEditorPage />;
  },
});
