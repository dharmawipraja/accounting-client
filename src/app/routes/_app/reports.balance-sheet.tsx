import { createFileRoute } from '@tanstack/react-router';
import { BalanceSheetPage } from '@/features/reports/BalanceSheetPage';

export const Route = createFileRoute('/_app/reports/balance-sheet')({
  component: BalanceSheetPage,
});
