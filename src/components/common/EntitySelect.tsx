import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import type { ApiError } from '@/lib/api/errors';
import type { Messages } from '@/lib/i18n/messages.id';

/** Everything an entity combobox needs to know about one kind of master data.
 *  Two adapters (accounts, partners, tax codes) satisfy it at the seam. */
export interface EntitySelectAdapter<T> {
  useList: () => UseQueryResult<T[], ApiError>;
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  /** cmdk search value; defaults to getLabel. */
  getSearchText?: (item: T) => string;
  /** Domain predicate (active / postable / allowedKinds…); defaults to all. */
  filter?: (item: T) => boolean;
}

type Status = 'loading' | 'error' | 'ready';

/** The shared depth: load + coalesce + domain-filter + code-sort + fetch status.
 *  Recomputed each render (small lists) so a changing `filter` never goes stale. */
function useEntitySelect<T>(adapter: EntitySelectAdapter<T>): { options: T[]; status: Status } {
  const list = adapter.useList();
  const search = adapter.getSearchText ?? adapter.getLabel;
  const options = (list.data ?? [])
    .filter((x) => (adapter.filter ? adapter.filter(x) : true))
    .sort((a, b) => search(a).localeCompare(search(b)));
  const status: Status = list.isLoading ? 'loading' : list.isError ? 'error' : 'ready';
  return { options, status };
}

function emptyText(status: Status, t: Messages): string {
  if (status === 'loading') return t.common.loading;
  if (status === 'error') return t.common.error;
  return t.common.noData;
}

/** The shared searchable option list — CommandInput + a status-aware empty state
 *  + the keyed Check indicator + combobox a11y. Selection semantics are injected. */
function EntityCommand<T>({
  adapter,
  options,
  status,
  isSelected,
  onPick,
  t,
}: {
  adapter: EntitySelectAdapter<T>;
  options: T[];
  status: Status;
  isSelected: (id: string) => boolean;
  onPick: (id: string) => void;
  t: Messages;
}) {
  const search = adapter.getSearchText ?? adapter.getLabel;
  return (
    <Command>
      <CommandInput placeholder={t.common.search} />
      <CommandList>
        <CommandEmpty>{emptyText(status, t)}</CommandEmpty>
        <CommandGroup>
          {options.map((item) => {
            const id = adapter.getValue(item);
            return (
              <CommandItem key={id} value={search(item)} onSelect={() => onPick(id)}>
                <Check className={cn('mr-2 size-4', isSelected(id) ? 'opacity-100' : 'opacity-0')} />
                {adapter.getLabel(item)}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

interface CommonProps {
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/** Single-select entity combobox: one label in the trigger, select-and-close. */
export function EntitySelect<T>({
  adapter,
  value,
  onChange,
  disabled,
  placeholder,
  'aria-label': ariaLabel,
}: CommonProps & { adapter: EntitySelectAdapter<T>; value?: string; onChange: (id: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { options, status } = useEntitySelect(adapter);
  const selected = options.find((o) => adapter.getValue(o) === value);
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
          {selected ? adapter.getLabel(selected) : (placeholder ?? t.common.search)}
          <ChevronsUpDown className="ml-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <EntityCommand
          adapter={adapter}
          options={options}
          status={status}
          t={t}
          isSelected={(id) => id === value}
          onPick={(id) => { onChange(id); setOpen(false); }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select entity combobox: a chip per selection, toggle without closing. */
export function EntityMultiSelect<T>({
  adapter,
  value,
  onChange,
  getChipLabel,
  disabled,
  placeholder,
  'aria-label': ariaLabel,
}: CommonProps & {
  adapter: EntitySelectAdapter<T>;
  value: string[];
  onChange: (ids: string[]) => void;
  getChipLabel?: (item: T) => string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { options, status } = useEntitySelect(adapter);
  const selected = options.filter((o) => value.includes(adapter.getValue(o)));
  const chip = getChipLabel ?? adapter.getLabel;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
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
          className="h-auto min-h-9 w-full justify-between font-normal"
        >
          <span className="flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder ?? t.common.search}</span>
            ) : (
              selected.map((o) => (
                <Badge key={adapter.getValue(o)} variant="secondary">{chip(o)}</Badge>
              ))
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <EntityCommand
          adapter={adapter}
          options={options}
          status={status}
          t={t}
          isSelected={(id) => value.includes(id)}
          onPick={toggle}
        />
      </PopoverContent>
    </Popover>
  );
}
