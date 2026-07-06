import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { documentStatusLabel } from '@/features/documents/statusLabel';
import { buildJournalColumns } from './columns';
import { useJournalEntries, useDeleteJournalEntry, usePostJournalEntry, useReverseJournalEntry } from './hooks';
import type { JournalEntryListItem } from './schema';

function useJournalEntriesList(q: Record<string, string | number | undefined>) {
  return useJournalEntries({
    status: q.status as string | undefined,
    sourceType: q.sourceType as string | undefined,
    limit: q.limit as number,
    offset: q.offset as number,
  });
}

export function JournalsPage({ initialStatus }: { initialStatus?: 'DRAFT' | 'POSTED' } = {}) {
  const t = useT();
  const remove = useDeleteJournalEntry();
  const post = usePostJournalEntry();
  const reverse = useReverseJournalEntry();

  const config: DocumentListConfig<JournalEntryListItem> = {
    title: t.journals.title,
    colCount: 5,
    list: useJournalEntriesList,
    columns: (h) => buildJournalColumns(t, { onDelete: h.onDelete!, onPost: h.onPost!, onReverse: h.onReverse! }),
    actions: {
      delete: { mutation: remove, success: t.journals.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.journals.posted, confirm: { title: t.journals.confirmPostTitle, description: t.journals.confirmPostDesc, label: t.journals.post } },
      reverse: { mutation: reverse, success: t.journals.reversed, confirm: { title: t.journals.confirmReverseTitle, description: t.journals.confirmReverseDesc, label: t.journals.reverse } },
    },
    filters: [
      { param: 'status', options: [
        { value: 'ALL', label: t.journals.statusAll },
        { value: 'DRAFT', label: documentStatusLabel(t, 'DRAFT') },
        { value: 'POSTED', label: documentStatusLabel(t, 'POSTED') },
      ] },
      { param: 'sourceType', options: [
        { value: 'ALL', label: t.journals.sourceAll },
        { value: 'MANUAL', label: t.journals.sourceManual },
      ] },
    ],
    initialFilters: initialStatus ? { status: initialStatus } : undefined,
    search: {}, // server-side ?q= (entryRef, description)
    newControl: <Button asChild><Link to="/journals/new"><Plus className="size-4" /> {t.journals.newEntry}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
