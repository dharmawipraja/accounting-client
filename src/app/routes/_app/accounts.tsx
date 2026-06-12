import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/accounts')({
  component: function AccountsRoute() {
    return <PageHeader title={useT().nav.accounts} />;
  },
});
