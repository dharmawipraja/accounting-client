import type { Messages } from '@/lib/i18n/messages.id';

export function subtypeLabel(t: Messages, subtype: string): string {
  return (t.reports.subtype as Record<string, string>)[subtype] ?? subtype;
}
