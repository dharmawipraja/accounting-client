import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

/** 404 surface. Defaults to the page-level 404 (big numeral + "back to
 *  dashboard"); pass title/message/action to reuse it as a record-not-found
 *  state on a detail page. */
export function NotFound({
  title,
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-muted-foreground/40">404</p>
      <p className="text-lg font-semibold">{title ?? t.notFound.pageTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message ?? t.notFound.pageMessage}</p>
      {action ?? (
        <Button asChild className="mt-2">
          <Link to="/dashboard">{t.notFound.backToDashboard}</Link>
        </Button>
      )}
    </div>
  );
}
