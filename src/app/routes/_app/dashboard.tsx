import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/dashboard')({
  component: function DashboardRoute() {
    return <PageHeader title={useT().nav.dashboard} />;
  },
});
