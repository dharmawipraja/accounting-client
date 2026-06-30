import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { documentStatusLabel } from './statusLabel';

describe('documentStatusLabel', () => {
  it('maps every document status to Indonesian', () => {
    expect(documentStatusLabel(id, 'DRAFT')).toBe('Draf');
    expect(documentStatusLabel(id, 'POSTED')).toBe('Diposting');
    expect(documentStatusLabel(id, 'VOID')).toBe('Dibatalkan');
    expect(documentStatusLabel(id, 'REVERSED')).toBe('Dibalik');
  });
});
