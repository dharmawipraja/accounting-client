import { createFileRoute, useParams } from '@tanstack/react-router';
import { BillEditorPage } from '@/features/purchase-bills/BillEditorPage';

export const Route = createFileRoute('/_app/purchase-bills/$id/edit')({
  component: function EditBillRoute() {
    const { id } = useParams({ from: '/_app/purchase-bills/$id/edit' });
    return <BillEditorPage id={id} />;
  },
});
