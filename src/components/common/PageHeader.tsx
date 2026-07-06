import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/** Parent routes a sub-page breadcrumb can point back to. Typed so a wrong route is a compile error. */
export type ParentRoute =
  | '/sales-invoices'
  | '/purchase-bills'
  | '/payments'
  | '/journals'
  | '/reports'
  | '/accounts'
  | '/partners';

/** A one-level breadcrumb trail: a link back to `parent`, then the current page (the `title`). */
export type PageParent = { to: ParentRoute; label: string };

export function PageHeader({
  title,
  actions,
  parent,
}: {
  title: string;
  actions?: ReactNode;
  parent?: PageParent;
}) {
  return (
    <div className="mb-6">
      {parent ? (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={parent.to}>{parent.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
