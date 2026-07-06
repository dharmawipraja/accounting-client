import { createFileRoute, useParams } from '@tanstack/react-router';
import { PartnerStatementPage } from '@/features/partners/PartnerStatementPage';

export const Route = createFileRoute('/_app/partners/$id')({
  component: function PartnerStatementRoute() {
    const { id } = useParams({ from: '/_app/partners/$id' });
    return <PartnerStatementPage id={id} />;
  },
});
