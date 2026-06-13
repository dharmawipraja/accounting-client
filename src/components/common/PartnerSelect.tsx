import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';

interface PartnerSelectProps {
  value?: string;
  onChange: (id: string) => void;
  filter?: 'customer' | 'vendor' | 'all';
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

export function PartnerSelect({ value, onChange, filter = 'all', disabled, placeholder, 'aria-label': ariaLabel }: PartnerSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = partnersApi.useList();

  const options = useMemo(
    () =>
      (list.data ?? [])
        .filter((p) => p.isActive && (filter === 'all' || (filter === 'customer' ? p.isCustomer : p.isVendor)))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [list.data, filter],
  );
  const selected = options.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          disabled={disabled} className="w-full justify-between font-normal">
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
              {options.map((p) => (
                <CommandItem key={p.id} value={`${p.code} ${p.name}`} onSelect={() => { onChange(p.id); setOpen(false); }}>
                  <Check className={cn('mr-2 size-4', p.id === value ? 'opacity-100' : 'opacity-0')} />
                  {p.code} — {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
