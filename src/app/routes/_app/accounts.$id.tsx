import { createFileRoute, useParams } from '@tanstack/react-router';
import { AccountLedgerPage } from '@/features/accounts/AccountLedgerPage';

export const Route = createFileRoute('/_app/accounts/$id')({
  component: function AccountLedgerRoute() {
    const { id } = useParams({ from: '/_app/accounts/$id' });
    return <AccountLedgerPage id={id} />;
  },
});
