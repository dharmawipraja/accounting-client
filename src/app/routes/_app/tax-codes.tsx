import { createFileRoute } from '@tanstack/react-router';
import { TaxCodesPage } from '@/features/tax-codes/TaxCodesPage';

export const Route = createFileRoute('/_app/tax-codes')({
  component: TaxCodesPage,
});
