import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import type { ApiError } from '@/lib/api/errors';

export interface DocumentEditorPageConfig<T extends { id: string; status: string }> {
  /** The loader hook, e.g. salesInvoicesApi.useItem. Disabled internally when id is empty. */
  useItem: (id: string) => UseQueryResult<T, ApiError>;
  /** Navigate-on-save and the not-found "back to list" action. Feature-supplied so
   *  the TanStack route literal keeps its type (mirrors DocumentListConfig.newControl). */
  onDone: () => void;
  /** Pre-rendered <BackLink> for the PageHeader. */
  back: ReactNode;
  titles: { create: string; edit: string; view: string };
  /** The one seam: maps the loaded doc onto the feature's form body. */
  renderForm: (ctx: { mode: 'create' | 'edit'; doc?: T; readOnly: boolean; onSaved: () => void }) => ReactNode;
}

/** Route-level wrapper shared by the invoice / bill / payment editor pages: load,
 *  new-vs-edit branch, not-found + loading envelope, the editable-only-while-DRAFT
 *  invariant, and navigate-on-save. The form body is supplied via config.renderForm. */
export function DocumentEditorPage<T extends { id: string; status: string }>({
  config,
  id,
}: {
  config: DocumentEditorPageConfig<T>;
  id?: string;
}) {
  const t = useT();
  const item = config.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={config.titles.create} back={config.back} />
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
        const readOnly = doc.status !== 'DRAFT';
        return (
          <div>
            <PageHeader title={readOnly ? config.titles.view : config.titles.edit} back={config.back} />
            {config.renderForm({ mode: 'edit', doc, readOnly, onSaved: config.onDone })}
          </div>
        );
      }}
    </QueryState>
  );
}
