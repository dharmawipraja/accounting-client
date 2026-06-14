import { createFileRoute } from '@tanstack/react-router';
import { JournalEntryEditorPage } from '@/features/journals/JournalEntryEditorPage';

export const Route = createFileRoute('/_app/journals/new')({
  component: function NewJournalRoute() {
    return <JournalEntryEditorPage />;
  },
});
