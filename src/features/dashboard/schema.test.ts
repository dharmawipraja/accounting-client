import { describe, expect, it } from 'vitest';
import { draftCountSchema } from './schema';

describe('dashboard schema', () => {
  it('draftCount reads the envelope total', () => {
    const r = draftCountSchema.parse({ data: [], total: 3, limit: 1, offset: 0 });
    expect(r.total).toBe(3);
  });
});
