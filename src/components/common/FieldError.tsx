/** A form field-error message: the shared `role="alert"` + destructive styling.
 *  Renders nothing when there is no message, so callers can pass a resolved
 *  message (or `undefined`) without their own ternary + markup. */
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="text-sm text-destructive">{message}</p>;
}
