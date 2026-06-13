import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/tax-codes')({
  component: function TaxCodesRoute() {
    return <PageHeader title={useT().nav.taxCodes} />;
  },
});
