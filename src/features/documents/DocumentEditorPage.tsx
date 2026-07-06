import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader, type PageParent } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { hasRole, useRole, useRoleReady } from '@/components/common/RoleGate';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import type { ApiError } from '@/lib/api/errors';
import type { Role } from '@/stores/session';

/** Document create/update is ACCOUNTANT/APPROVER/ADMIN per the API role matrix.
 *  The backend enforces this; the page re-checks it so a VIEWER navigating here
 *  by URL never sees a live form (defense-in-depth, same pattern as AuditPage). */
const EDITOR_ROLES: Role[] = ['ACCOUNTANT', 'APPROVER', 'ADMIN'];

export interface DocumentEditorPageConfig<T extends { id: string; status: string }> {
  /** The loader hook, e.g. salesInvoicesApi.useItem. Disabled internally when id is empty. */
  useItem: (id: string) => UseQueryResult<T, ApiError>;
  /** Navigate-on-save and the not-found "back to list" action. Feature-supplied so
   *  the TanStack route literal keeps its type (mirrors DocumentListConfig.newControl). */
  onDone: () => void;
  /** Breadcrumb parent (link back to the list) shown above the page title. */
  parent: PageParent;
  titles: { create: string; edit: string; view: string };
  /** Force every loaded document read-only regardless of status. For resources the
   *  API cannot update (payments: create / post / void / delete only). */
  forceReadOnly?: boolean;
  /** The one seam: maps the loaded doc onto the feature's form body. */
  renderForm: (ctx: { mode: 'create' | 'edit'; doc?: T; readOnly: boolean; onSaved: () => void }) => ReactNode;
}

/** Route-level wrapper shared by the invoice / bill / payment editor pages: load,
 *  new-vs-edit branch, not-found + loading envelope, the editable-only-while-DRAFT
 *  invariant, and navigate-on-save. The form body is supplied via config.renderForm. */
export function DocumentEditorPage<T extends { id: string; status: string }>({
  config,
  id,
  duplicateFromId,
}: {
  config: DocumentEditorPageConfig<T>;
  id?: string;
  /** Create a new draft pre-filled from this existing document (Duplicate). */
  duplicateFromId?: string;
}) {
  const t = useT();
  const roleReady = useRoleReady();
  const canEdit = hasRole(useRole(), EDITOR_ROLES);
  const item = config.useItem(id ?? '');
  const source = config.useItem(!id && duplicateFromId ? duplicateFromId : '');

  // Token present but /auth/me not hydrated yet: the role is unknown, so
  // neither the form nor "forbidden" is correct — show the loading skeleton.
  if (!roleReady) {
    return <SkeletonForm fields={6} />;
  }

  if (!id) {
    if (!canEdit) {
      return (
        <div>
          <PageHeader title={config.titles.create} parent={config.parent} />
          <p className="text-sm text-muted-foreground">{t.roles.forbidden}</p>
        </div>
      );
    }
    // Duplicate: fetch the source doc, then render a CREATE form pre-filled from it
    // (a fresh draft — never an edit of the source).
    if (duplicateFromId) {
      return (
        <QueryState query={source} loading={<SkeletonForm fields={6} />} onRetry>
          {(doc) => (
            <div>
              <PageHeader title={config.titles.create} parent={config.parent} />
              {config.renderForm({ mode: 'create', doc, readOnly: false, onSaved: config.onDone })}
            </div>
          )}
        </QueryState>
      );
    }
    return (
      <div>
        <PageHeader title={config.titles.create} parent={config.parent} />
        {config.renderForm({ mode: 'create', readOnly: false, onSaved: config.onDone })}
      </div>
    );
  }

  return (
    <QueryState
      query={item}
      loading={<SkeletonForm fields={6} />}
      onRetry
      notFound={
        <NotFound
          title={t.notFound.recordTitle}
          message={t.notFound.recordMessage}
          action={<Button onClick={config.onDone}>{t.notFound.backToList}</Button>}
        />
      }
    >
      {(doc) => {
        const readOnly = config.forceReadOnly || doc.status !== 'DRAFT' || !canEdit;
        return (
          <div>
            <PageHeader title={readOnly ? config.titles.view : config.titles.edit} parent={config.parent} />
            {config.renderForm({ mode: 'edit', doc, readOnly, onSaved: config.onDone })}
          </div>
        );
      }}
    </QueryState>
  );
}
