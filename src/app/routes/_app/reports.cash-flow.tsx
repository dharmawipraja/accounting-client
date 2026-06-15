import { createFileRoute } from '@tanstack/react-router';
import { CashFlowPage } from '@/features/reports/CashFlowPage';

export const Route = createFileRoute('/_app/reports/cash-flow')({
  component: CashFlowPage,
});
