import { describe, expect, it } from 'vitest';
import { balanceOf, isBalanced } from './balance';

describe('journal balance', () => {
  it('balanced when debit and credit totals are equal and positive', () => {
    const lines = [{ debit: '100000', credit: '' }, { debit: '', credit: '100000' }];
    expect(isBalanced(lines)).toBe(true);
    expect(balanceOf(lines).difference.toApi()).toBe('0.0000');
  });
  it('unbalanced when the two sides differ', () => {
    expect(isBalanced([{ debit: '100000', credit: '' }, { debit: '', credit: '50000' }])).toBe(false);
  });
  it('not balanced when both totals are zero', () => {
    expect(isBalanced([{ debit: '', credit: '' }, { debit: '', credit: '' }])).toBe(false);
  });
  it('computes running totals', () => {
    const b = balanceOf([{ debit: '60000', credit: '' }, { debit: '40000', credit: '' }, { debit: '', credit: '100000' }]);
    expect(b.totalDebit.toApi()).toBe('100000.0000');
    expect(b.totalCredit.toApi()).toBe('100000.0000');
  });
});
