import { createFileRoute } from '@tanstack/react-router';
import { AgingPage } from '@/features/reports/AgingPage';

export const Route = createFileRoute('/_app/reports/ar-aging')({
  component: () => <AgingPage kind="AR" />,
});
