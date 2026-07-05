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
  it('formatAuditTime renders the local wall-clock time, not the raw UTC digits', () => {
    // Independent expectation via the Date API: whatever timezone the test runs
    // in, the rendered time must be the LOCAL time of that UTC instant.
    const d = new Date('2026-06-15T13:18:25.590Z');
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    expect(formatAuditTime('2026-06-15T13:18:25.590Z')).toBe(expected);
  });
});
