import { createFileRoute } from '@tanstack/react-router';
import { ReportsIndexPage } from '@/features/reports/ReportsIndexPage';

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsIndexPage,
});
