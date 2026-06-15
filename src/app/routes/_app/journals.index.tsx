import { createFileRoute } from '@tanstack/react-router';
import { JournalsPage } from '@/features/journals/JournalsPage';

export const Route = createFileRoute('/_app/journals/')({
  validateSearch: (search: Record<string, unknown>): { status?: 'DRAFT' | 'POSTED' } => ({
    status: search.status === 'DRAFT' || search.status === 'POSTED' ? search.status : undefined,
  }),
  component: function JournalsRoute() {
    const { status } = Route.useSearch();
    return <JournalsPage initialStatus={status} />;
  },
});
