import type * as React from 'react';
import { Breadcrumbs, type Crumb } from './breadcrumbs';

export function PageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="hidden sm:block text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">{actions}</div>}
      </div>
    </div>
  );
}
