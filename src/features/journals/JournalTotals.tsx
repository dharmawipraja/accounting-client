import { useT } from '@/lib/i18n/useT';
import { balanceOf, isBalanced, type BalanceLine } from './balance';

export function JournalTotals({ lines }: { lines: BalanceLine[] }) {
  const t = useT();
  const { totalDebit, totalCredit, difference } = balanceOf(lines);
  const balanced = isBalanced(lines);
  return (
    <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
      <Row label={t.journals.totalDebitLabel} value={totalDebit.toRupiah()} />
      <Row label={t.journals.totalCreditLabel} value={totalCredit.toRupiah()} />
      <div className="border-t pt-1">
        <Row label={t.journals.difference} value={difference.toRupiah()} bold />
      </div>
      <p className={`text-xs ${balanced ? 'text-muted-foreground' : 'text-destructive'}`}>
        {balanced ? t.journals.balanced : t.journals.unbalanced}
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
