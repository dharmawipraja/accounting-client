import { createFileRoute } from '@tanstack/react-router';
import { GeneralLedgerPage } from '@/features/reports/GeneralLedgerPage';

export const Route = createFileRoute('/_app/reports/general-ledger')({
  validateSearch: (search: Record<string, unknown>): { accountId?: string } => ({
    accountId: typeof search.accountId === 'string' ? search.accountId : undefined,
  }),
  component: function GeneralLedgerRoute() {
    const { accountId } = Route.useSearch();
    return <GeneralLedgerPage initialAccountId={accountId} />;
  },
});
