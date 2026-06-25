import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { buildInvoiceColumns } from './columns';
import { salesInvoicesApi, usePostInvoice, useVoidInvoice } from './hooks';
import type { SalesInvoice } from './schema';

export function SalesInvoicesPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const remove = salesInvoicesApi.useRemove();
  const post = usePostInvoice();
  const voidInvoice = useVoidInvoice();

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const config: DocumentListConfig<SalesInvoice> = {
    title: t.salesInvoices.title,
    colCount: 6,
    list: salesInvoicesApi.usePagedList,
    columns: (h) => buildInvoiceColumns(t, partnerName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.salesInvoices.posted, confirm: { title: t.salesInvoices.confirmPostTitle, description: t.salesInvoices.confirmPostDesc, label: t.salesInvoices.post } },
      void: { mutation: voidInvoice, success: t.salesInvoices.voided, confirm: { title: t.salesInvoices.confirmVoidTitle, description: t.salesInvoices.confirmVoidDesc, label: t.salesInvoices.void } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: t.salesInvoices.statusAll },
      { value: 'DRAFT', label: t.salesInvoices.statusDraft },
      { value: 'POSTED', label: t.salesInvoices.statusPosted },
      { value: 'VOID', label: t.salesInvoices.statusVoid },
    ] }],
    search: { predicate: (inv, q) => (inv.invoiceRef ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q) },
    newControl: <Button asChild><Link to="/sales-invoices/new"><Plus className="size-4" /> {t.salesInvoices.newInvoice}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
