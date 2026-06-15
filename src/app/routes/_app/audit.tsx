import { createFileRoute } from '@tanstack/react-router';
import { AuditPage } from '@/features/audit/AuditPage';

export const Route = createFileRoute('/_app/audit')({
  component: AuditPage,
});
