import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { useEntityLabelMap } from '@/lib/hooks/useEntityLabelMap';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { documentStatusLabel } from '@/features/documents/statusLabel';
import { buildBillColumns } from './columns';
import { purchaseBillsApi, usePostBill, useVoidBill } from './hooks';
import type { PurchaseBill } from './schema';

export function PurchaseBillsPage() {
  const t = useT();
  const remove = purchaseBillsApi.useRemove();
  const post = usePostBill();
  const voidBill = useVoidBill();

  const partnerName = useEntityLabelMap(partnersApi.useList, (p) => p.name);

  const config: DocumentListConfig<PurchaseBill> = {
    title: t.purchaseBills.title,
    colCount: 6,
    list: purchaseBillsApi.usePagedList,
    columns: (h) => buildBillColumns(t, partnerName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.purchaseBills.posted, confirm: { title: t.purchaseBills.confirmPostTitle, description: t.purchaseBills.confirmPostDesc, label: t.purchaseBills.post } },
      void: { mutation: voidBill, success: t.purchaseBills.voided, confirm: { title: t.purchaseBills.confirmVoidTitle, description: t.purchaseBills.confirmVoidDesc, label: t.purchaseBills.void } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: t.purchaseBills.statusAll },
      { value: 'DRAFT', label: documentStatusLabel(t, 'DRAFT') },
      { value: 'POSTED', label: documentStatusLabel(t, 'POSTED') },
      { value: 'VOID', label: documentStatusLabel(t, 'VOID') },
    ] }],
    search: {}, // server-side ?q= (billRef, vendorInvoiceNo, description, vendor name + code)
    describeDoc: (bill) => (
      <div className="flex items-center justify-between gap-4">
        <span className="truncate">{[bill.billRef, partnerName(bill.partnerId)].filter(Boolean).join(' · ')}</span>
        <MoneyText value={bill.total} />
      </div>
    ),
    newControl: <Button asChild><Link to="/purchase-bills/new"><Plus className="size-4" /> {t.purchaseBills.newBill}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
