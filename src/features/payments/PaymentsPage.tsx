import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityLabelMap } from '@/lib/hooks/useEntityLabelMap';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { accountsApi } from '@/features/accounts/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { documentStatusLabel } from '@/features/documents/statusLabel';
import { buildPaymentColumns } from './columns';
import { paymentsApi, usePostPayment, useVoidPayment } from './hooks';
import type { Payment } from './schema';

export function PaymentsPage() {
  const t = useT();
  const remove = paymentsApi.useRemove();
  const post = usePostPayment();
  const voidPayment = useVoidPayment();

  const partnerName = useEntityLabelMap(partnersApi.useList, (p) => p.name);
  const accountName = useEntityLabelMap(accountsApi.useList, (a) => `${a.code} — ${a.name}`);

  const config: DocumentListConfig<Payment> = {
    title: t.payments.title,
    colCount: 6,
    list: paymentsApi.usePagedList,
    columns: (h) => buildPaymentColumns(t, partnerName, accountName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.payments.posted, confirm: { title: t.payments.confirmPostTitle, description: t.payments.confirmPostDesc, label: t.payments.post } },
      void: { mutation: voidPayment, success: t.payments.voided, confirm: { title: t.payments.confirmVoidTitle, description: t.payments.confirmVoidDesc, label: t.payments.void } },
    },
    filters: [
      { param: 'status', options: [
        { value: 'ALL', label: t.payments.statusAll },
        { value: 'DRAFT', label: documentStatusLabel(t, 'DRAFT') },
        { value: 'POSTED', label: documentStatusLabel(t, 'POSTED') },
        { value: 'VOID', label: documentStatusLabel(t, 'VOID') },
      ] },
      { param: 'direction', options: [
        { value: 'ALL', label: t.payments.directionAll },
        { value: 'RECEIPT', label: t.payments.directionReceipt },
        { value: 'DISBURSEMENT', label: t.payments.directionDisbursement },
      ] },
    ],
    search: { predicate: (p, q) => (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q) },
    newControl: (
      <div className="flex gap-2">
        <Button asChild variant="outline"><Link to="/payments/new" search={{ direction: 'RECEIPT' }}><Plus className="size-4" /> {t.payments.directionReceipt}</Link></Button>
        <Button asChild><Link to="/payments/new" search={{ direction: 'DISBURSEMENT' }}><Plus className="size-4" /> {t.payments.directionDisbursement}</Link></Button>
      </div>
    ),
  };

  return <DocumentListPage config={config} />;
}
