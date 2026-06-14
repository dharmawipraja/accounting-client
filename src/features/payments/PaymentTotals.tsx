import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';

/** Sum the allocation amounts (decimal) into the Total Diterima. */
export function PaymentTotals({ amounts }: { amounts: Record<string, string> }) {
  const t = useT();
  const total = Object.values(amounts).reduce((acc, v) => {
    try { return acc.plus(Money.from(v || '0')); } catch { return acc; }
  }, Money.zero());
  return (
    <div className="ml-auto w-full max-w-xs rounded-lg border p-4 text-sm">
      <div className="flex justify-between font-semibold">
        <span className="text-muted-foreground">{t.payments.amount}</span>
        <span className="font-mono tabular-nums">{total.toRupiah()}</span>
      </div>
    </div>
  );
}

/** Exported for reuse by the form's validation/payload building. */
export function sumAmounts(amounts: Record<string, string>): Money {
  return Object.values(amounts).reduce((acc, v) => {
    try { return acc.plus(Money.from(v || '0')); } catch { return acc; }
  }, Money.zero());
}
