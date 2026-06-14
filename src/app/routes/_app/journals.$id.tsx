import { createFileRoute, useParams } from '@tanstack/react-router';
import { JournalEntryEditorPage } from '@/features/journals/JournalEntryEditorPage';

export const Route = createFileRoute('/_app/journals/$id')({
  component: function ViewJournalRoute() {
    const { id } = useParams({ from: '/_app/journals/$id' });
    return <JournalEntryEditorPage id={id} />;
  },
});
