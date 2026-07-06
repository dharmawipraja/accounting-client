import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FilePlus, Plus } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useNavItems } from '@/components/app-shared';
import { hasRole, useRole } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';

const COMMAND_PALETTE_OPEN = 'command-palette:open';

/** Cmd/Ctrl-K command palette: jump to any page, or (for editors) start a new
 *  document. A keyboard-first affordance for the dense desk-work context. */
export function CommandPalette() {
  const t = useT();
  const navigate = useNavigate();
  const groups = useNavItems();
  const canCreate = hasRole(useRole(), ['ACCOUNTANT', 'APPROVER', 'ADMIN']);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(COMMAND_PALETTE_OPEN, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(COMMAND_PALETTE_OPEN, onOpen);
    };
  }, []);

  // navigate() is typed against the app route tree; the `to`s below are all valid.
  const go = (to: Parameters<typeof navigate>[0]['to']) => {
    setOpen(false);
    navigate({ to });
  };

  const createActions = [
    { to: '/sales-invoices/new' as const, label: t.salesInvoices.newInvoice },
    { to: '/purchase-bills/new' as const, label: t.purchaseBills.newBill },
    { to: '/journals/new' as const, label: t.journals.newEntry },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t.command.title} description={t.command.description}>
      <Command>
        <CommandInput placeholder={t.command.placeholder} />
        <CommandList>
        <CommandEmpty>{t.common.noResults}</CommandEmpty>
        {canCreate ? (
          <CommandGroup heading={t.command.create}>
            {createActions.map((a) => (
              <CommandItem key={a.to} value={a.label} onSelect={() => go(a.to)}>
                <FilePlus className="size-4" /> {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading={t.command.navigate}>
          {groups.flatMap((g) => g.items).map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon className="size-4" /> {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** A subtle header trigger for discoverability (the shortcut is Cmd/Ctrl-K).
 *  Dispatches the open event the palette listens for — no shared state needed. */
export function CommandPaletteHint() {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN))}
      aria-label={t.command.title}
      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plus className="size-3.5" />
      <kbd className="font-sans">⌘K</kbd>
    </button>
  );
}
