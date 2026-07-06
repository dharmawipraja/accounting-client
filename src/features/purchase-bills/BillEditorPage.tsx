import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { useBillEditorConfig } from './editorConfig';
import { purchaseBillsApi } from './hooks';

export function BillEditorPage({ id, duplicateFromId }: { id?: string; duplicateFromId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const editorConfig = useBillEditorConfig();
  return (
    <DocumentEditorPage
      id={id}
      duplicateFromId={duplicateFromId}
      config={{
        useItem: purchaseBillsApi.useItem,
        onDone: () => navigate({ to: '/purchase-bills' }),
        parent: { to: '/purchase-bills', label: t.nav.purchaseBills },
        titles: { create: t.purchaseBills.newBill, edit: t.purchaseBills.editBill, view: t.purchaseBills.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <DocumentEditor config={editorConfig} mode={mode} doc={doc} readOnly={readOnly} onSaved={onSaved} />
        ),
      }}
    />
  );
}
