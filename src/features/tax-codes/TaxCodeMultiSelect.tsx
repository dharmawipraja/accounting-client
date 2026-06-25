import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { taxCodesApi } from './hooks';

interface TaxCodeMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  allowedKinds: string[];
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

export function TaxCodeMultiSelect({ value, onChange, allowedKinds, disabled, placeholder, 'aria-label': ariaLabel }: TaxCodeMultiSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = taxCodesApi.useList();

  const options = useMemo(
    () => (list.data ?? []).filter((c) => c.isActive && allowedKinds.includes(c.kind)),
    [list.data, allowedKinds],
  );
  const selectedCodes = options.filter((o) => value.includes(o.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          disabled={disabled} className="h-auto min-h-9 w-full justify-between font-normal">
          <span className="flex flex-wrap gap-1">
            {selectedCodes.length === 0
              ? <span className="text-muted-foreground">{placeholder ?? t.common.search}</span>
              : selectedCodes.map((c) => <Badge key={c.id} variant="secondary">{c.code}</Badge>)}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t.common.search} />
          <CommandList>
            <CommandEmpty>{t.common.noData}</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem key={c.id} value={`${c.code} ${c.name}`} onSelect={() => toggle(c.id)}>
                  <Check className={cn('mr-2 size-4', value.includes(c.id) ? 'opacity-100' : 'opacity-0')} />
                  {c.code} — {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
