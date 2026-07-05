import { Ban, Lock } from 'lucide-react';

/** The read-only status banner shown atop a posted or voided document editor.
 *  Concentrates the banner styling, the status label + icon choice, and the
 *  optional ` (ref)` suffix in one place (used by DocumentEditor + PaymentForm).
 *  `draftLabel` covers resources whose drafts are also immutable (payments). */
export function ReadOnlyBanner({
  show,
  status,
  docRef,
  postedLabel,
  voidLabel,
  draftLabel,
}: {
  show: boolean;
  status: string | undefined;
  docRef: string | null | undefined;
  postedLabel: string;
  voidLabel: string;
  draftLabel?: string;
}) {
  if (!show) return null;
  const isVoid = status === 'VOID';
  const Icon = isVoid ? Ban : Lock;
  const label = isVoid ? voidLabel : status === 'DRAFT' && draftLabel ? draftLabel : postedLabel;
  return (
    <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {label}
        {docRef ? ` (${docRef})` : ''}
      </span>
    </div>
  );
}
