import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TrialBalancePage } from '@/features/reports/TrialBalancePage';

export const Route = createFileRoute('/_app/reports/trial-balance')({
  component: function TrialBalanceRoute() {
    const navigate = useNavigate();
    return (
      <TrialBalancePage
        onOpenAccount={(accountId) => navigate({ to: '/reports/general-ledger', search: { accountId } })}
      />
    );
  },
});
