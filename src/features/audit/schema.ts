import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const auditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string().nullish(),
  userRole: z.string().nullish(),
  method: z.string(),
  path: z.string(),
  params: z.unknown(),
  body: z.unknown(),
  statusCode: z.number().nullish(),
  durationMs: z.number().nullish(),
  ip: z.string().nullish(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export const auditListSchema = z.array(auditEntrySchema);

export const AUDIT_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const;

/** Audit timestamps carry a UTC instant; render it as LOCAL wall-clock time
 *  (slicing the raw string would show UTC digits — 7 hours off for WIB users,
 *  and the wrong calendar date near midnight). */
export function formatAuditTime(ts: string): string {
  return format(parseISO(ts), 'dd/MM/yyyy HH:mm:ss', { locale: idLocale });
}
