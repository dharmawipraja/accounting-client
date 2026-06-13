import { Input } from '@/components/ui/input';

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  'aria-label'?: string;
  id?: string;
  placeholder?: string;
}

/** Keeps the raw decimal string; only allows digits, one dot, and a leading minus. */
export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <Input
      inputMode="decimal"
      className="text-right font-mono tabular-nums"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (next === '' || /^-?\d*\.?\d{0,4}$/.test(next)) onChange(next);
      }}
      {...rest}
    />
  );
}
