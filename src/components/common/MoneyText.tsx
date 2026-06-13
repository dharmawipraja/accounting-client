import { Money } from '@/lib/money/money';

/** Right-aligned, tabular rupiah display from a 4dp API string. */
export function MoneyText({ value }: { value: string }) {
  return (
    <span className="font-mono tabular-nums">{Money.from(value).toRupiah()}</span>
  );
}
