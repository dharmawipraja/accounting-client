import { Input } from '@/components/ui/input';

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  /** Allow a leading minus. Default true; pass false for amounts that must be positive (e.g. payment allocations). */
  allowNegative?: boolean;
  'aria-label'?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

/** Keeps the raw decimal string; only allows digits, one dot, and (optionally) a leading minus. */
export function MoneyInput({ value, onChange, allowNegative = true, ...rest }: MoneyInputProps) {
  const pattern = allowNegative ? /^-?\d*\.?\d{0,4}$/ : /^\d*\.?\d{0,4}$/;
  return (
    <Input
      inputMode="decimal"
      className="text-right tabular-nums"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (next === '' || pattern.test(next)) onChange(next);
      }}
      {...rest}
    />
  );
}
