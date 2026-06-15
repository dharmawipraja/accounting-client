import { createFileRoute } from '@tanstack/react-router';
import { PeriodsPage } from '@/features/periods/PeriodsPage';

export const Route = createFileRoute('/_app/periods')({
  component: PeriodsPage,
});
