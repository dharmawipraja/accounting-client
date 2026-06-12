import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/partners')({
  component: function PartnersRoute() {
    return <PageHeader title={useT().nav.partners} />;
  },
});
