import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';

interface AccountSelectProps {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

export function AccountSelect({ value, onChange, disabled, placeholder, 'aria-label': ariaLabel }: AccountSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = accountsApi.useList();

  const options = useMemo(
    () =>
      (list.data ?? [])
        .filter((a) => a.isPostable && a.isActive)
        .sort((x, y) => x.code.localeCompare(y.code)),
    [list.data],
  );
  const selected = options.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? `${selected.code} — ${selected.name}` : (placeholder ?? t.common.search)}
          <ChevronsUpDown className="ml-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t.common.search} />
          <CommandList>
            <CommandEmpty>{t.common.noData}</CommandEmpty>
            <CommandGroup>
              {options.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`${a.code} ${a.name}`}
                  onSelect={() => { onChange(a.id); setOpen(false); }}
                >
                  <Check className={cn('mr-2 size-4', a.id === value ? 'opacity-100' : 'opacity-0')} />
                  {a.code} — {a.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
