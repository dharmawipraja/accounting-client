import { describe, expect, it } from 'vitest';
import { auditEntrySchema, formatAuditTime } from './schema';

describe('audit schema + helpers', () => {
  it('parses an entry with null user + object body/params', () => {
    const e = auditEntrySchema.parse({
      id: 'a1', timestamp: '2026-06-15T13:18:25.590Z', userId: null, userRole: null,
      method: 'POST', path: '/auth/login', params: {}, body: { email: 'x', password: '[REDACTED]' },
      statusCode: 200, durationMs: 127, ip: '::1',
    });
    expect(e.method).toBe('POST');
    expect(e.userId).toBeNull();
    expect((e.body as { email: string }).email).toBe('x');
  });
  it('formatAuditTime returns date + HH:MM:SS', () => {
    expect(formatAuditTime('2026-06-15T13:18:25.590Z')).toMatch(/13:18:25$/);
  });
});
