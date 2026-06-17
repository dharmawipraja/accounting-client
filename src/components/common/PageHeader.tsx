import type { ReactNode } from 'react';

export function PageHeader({
  title,
  actions,
  back,
}: {
  title: string;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back ? <div className="mb-2">{back}</div> : null}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
