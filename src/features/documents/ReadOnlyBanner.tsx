/** The read-only status banner shown atop a posted or voided document editor.
 *  Concentrates the banner styling, the VOID-vs-POSTED label choice, and the
 *  optional ` (ref)` suffix in one place (used by DocumentEditor + PaymentForm). */
export function ReadOnlyBanner({
  show,
  status,
  docRef,
  postedLabel,
  voidLabel,
}: {
  show: boolean;
  status: string | undefined;
  docRef: string | null | undefined;
  postedLabel: string;
  voidLabel: string;
}) {
  if (!show) return null;
  return (
    <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      {status === 'VOID' ? voidLabel : postedLabel}
      {docRef ? ` (${docRef})` : ''}
    </div>
  );
}
