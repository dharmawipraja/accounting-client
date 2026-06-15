import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { subtypeLabel } from './subtypeLabel';

describe('subtypeLabel', () => {
  it('maps known subtypes to Indonesian', () => {
    expect(subtypeLabel(id, 'CURRENT_ASSET')).toBe('Aset Lancar');
    expect(subtypeLabel(id, 'TAX_PAYABLE')).toBe('Utang Pajak');
  });
  it('falls back to the raw value for unknown subtypes', () => {
    expect(subtypeLabel(id, 'WEIRD_SUBTYPE')).toBe('WEIRD_SUBTYPE');
  });
});
