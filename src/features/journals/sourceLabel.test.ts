import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { journalSourceLabel } from './sourceLabel';

describe('journalSourceLabel', () => {
  it('labels every real API source type', () => {
    expect(journalSourceLabel(id, 'MANUAL')).toBe('Manual');
    expect(journalSourceLabel(id, 'OPENING')).toBe('Saldo Awal');
    expect(journalSourceLabel(id, 'REVERSAL')).toBe('Pembalik');
    expect(journalSourceLabel(id, 'SALES_INVOICE')).toBe('Penjualan');
    expect(journalSourceLabel(id, 'PURCHASE_BILL')).toBe('Pembelian');
    expect(journalSourceLabel(id, 'PAYMENT')).toBe('Pembayaran');
    expect(journalSourceLabel(id, 'CLOSING')).toBe('Tutup Buku');
  });
  it('falls back to the raw value for unknown sources', () => {
    expect(journalSourceLabel(id, 'WHATEVER')).toBe('WHATEVER');
  });
});
