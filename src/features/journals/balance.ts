import { Money } from '@/lib/money/money';

export type BalanceLine = { debit: string; credit: string };

function sumSide(lines: BalanceLine[], side: 'debit' | 'credit'): Money {
  return lines.reduce((acc, l) => {
    try { return acc.plus(Money.from(l[side] || '0')); } catch { return acc; }
  }, Money.zero());
}

export function balanceOf(lines: BalanceLine[]): { totalDebit: Money; totalCredit: Money; difference: Money } {
  const totalDebit = sumSide(lines, 'debit');
  const totalCredit = sumSide(lines, 'credit');
  return { totalDebit, totalCredit, difference: totalDebit.minus(totalCredit) };
}

export function isBalanced(lines: BalanceLine[]): boolean {
  const { totalDebit, totalCredit } = balanceOf(lines);
  return totalDebit.eq(totalCredit) && totalDebit.gt(Money.zero());
}
