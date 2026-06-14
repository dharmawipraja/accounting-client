import { createFileRoute } from '@tanstack/react-router';
import { JournalsPage } from '@/features/journals/JournalsPage';

export const Route = createFileRoute('/_app/journals/')({
  component: JournalsPage,
});
