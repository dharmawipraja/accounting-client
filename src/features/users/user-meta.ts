import type { Role } from '@/stores/session';
import type { Messages } from '@/lib/i18n/messages.id';

export const ROLE_OPTIONS: Role[] = ['VIEWER', 'ACCOUNTANT', 'APPROVER', 'ADMIN'];

export function roleLabel(t: Messages, role: Role): string {
  return t.users.roleLabels[role];
}
