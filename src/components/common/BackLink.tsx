import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

/** Parent routes a sub-page can return to. Typed so a wrong route is a compile error. */
type ParentRoute = '/sales-invoices' | '/purchase-bills' | '/payments' | '/journals' | '/reports';

export function BackLink({ to, label }: { to: ParentRoute; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
