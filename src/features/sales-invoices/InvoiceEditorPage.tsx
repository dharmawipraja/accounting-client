import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { useInvoiceEditorConfig } from './editorConfig';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id, duplicateFromId }: { id?: string; duplicateFromId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const editorConfig = useInvoiceEditorConfig();
  return (
    <DocumentEditorPage
      id={id}
      duplicateFromId={duplicateFromId}
      config={{
        useItem: salesInvoicesApi.useItem,
        onDone: () => navigate({ to: '/sales-invoices' }),
        parent: { to: '/sales-invoices', label: t.nav.salesInvoices },
        titles: { create: t.salesInvoices.newInvoice, edit: t.salesInvoices.editInvoice, view: t.salesInvoices.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <DocumentEditor config={editorConfig} mode={mode} doc={doc} readOnly={readOnly} onSaved={onSaved} />
        ),
      }}
    />
  );
}
