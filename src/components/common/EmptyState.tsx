import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n/useT';

/** Empty-state placeholder. Defaults to a terse "no data" line; pass `title` +
 *  `description` + `action` to turn it into a teaching state that names what
 *  belongs here and offers the primary next step (e.g. create the first record). */
export function EmptyState({
  message,
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  /** Back-compat single-line body; use `description` for new callers. */
  message?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  const t = useT();
  const body = description ?? message ?? t.common.noData;
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
