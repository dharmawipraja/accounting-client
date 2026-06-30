import type { Messages } from '@/lib/i18n/messages.id';

export type DocumentStatus = 'DRAFT' | 'POSTED' | 'VOID' | 'REVERSED';

/** One label for every document/journal status. Callers pass the raw status
 *  string from the API (typed `string` in the schemas); cast at the call site. */
export function documentStatusLabel(t: Messages, status: DocumentStatus): string {
  return t.documents.status[status];
}
