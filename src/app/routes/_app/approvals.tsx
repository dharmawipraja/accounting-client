import { createFileRoute } from '@tanstack/react-router';
import { ApprovalQueuePage } from '@/features/approvals/ApprovalQueuePage';

export const Route = createFileRoute('/_app/approvals')({
  component: ApprovalQueuePage,
});
