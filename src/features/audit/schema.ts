import { z } from 'zod';
import { formatDateID } from '@/lib/format/date';

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

export function formatAuditTime(ts: string): string {
  return `${formatDateID(ts.slice(0, 10))} ${ts.slice(11, 19)}`;
}
