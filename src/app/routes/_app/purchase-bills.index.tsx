import { createFileRoute } from '@tanstack/react-router';
import { PurchaseBillsPage } from '@/features/purchase-bills/PurchaseBillsPage';

export const Route = createFileRoute('/_app/purchase-bills/')({
  component: PurchaseBillsPage,
});
