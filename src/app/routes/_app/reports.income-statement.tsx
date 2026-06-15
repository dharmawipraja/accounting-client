import { createFileRoute } from '@tanstack/react-router';
import { IncomeStatementPage } from '@/features/reports/IncomeStatementPage';

export const Route = createFileRoute('/_app/reports/income-statement')({
  component: IncomeStatementPage,
});
