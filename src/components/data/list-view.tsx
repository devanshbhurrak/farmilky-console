import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from './data-table';
import type { Column } from './data-table';
import { FilterBar, type ActiveFilter } from './filter-bar';
import { FilterButton, FilterDrawer, useFilterDrawer } from './filter-drawer';
import { SearchInput } from './search-input';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { cn } from '@/lib/utils';

export interface ListViewFilters {
  [key: string]: string;
}

export interface ListViewConfig<T> {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  createAction?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterConfig?: {
    fields: Record<string, {
      label: string;
      type: 'select' | 'date' | 'text';
      options?: Array<{ value: string; label: string }>;
      placeholder?: string;
    }>;
    initialValues: ListViewFilters;
  };
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  renderCard?: (item: T) => React.ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  children?: React.ReactNode;
}

function getActiveFilters(
  current: ListViewFilters,
  initial: ListViewFilters
): ActiveFilter[] {
  return Object.entries(current)
    .filter(([key, value]) => value && value !== (initial[key] || 'all'))
    .map(([key, value]) => {
      return {
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        value,
      };
    });
}

function updateUrlParams(
  // react-router's setter accepts (nextInit, navigateOptions) — typing it as a
  // plain useState setter rejects the `{ replace: true }` option below.
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  params: Record<string, string>,
  currentParams: URLSearchParams
) {
  const next = new URLSearchParams(currentParams);
  for (const [k, v] of Object.entries(params)) {
    if (!v || v === 'all' || v === '' || (k === 'page' && v === '1')) {
      next.delete(k);
    } else {
      next.set(k, v);
    }
  }
  setSearchParams(next, { replace: true });
}
function FilterField({
  label,
  type,
  value,
  options,
  placeholder,
  onChange,
  fullWidth = false,
}: {
  label: string;
  type: 'select' | 'date' | 'text';
  value: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
}) {
  if (type === 'select') {
    return (
      <div className={cn('flex items-center gap-1', fullWidth ? 'w-full' : 'shrink-0')}>
        <label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="hidden sm:block text-xs font-medium text-slate-500">
          {label}
        </label>
        <select
          id={label.toLowerCase().replace(/\s+/g, '-')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(
            'min-h-11 px-3 text-sm border border-slate-300 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            fullWidth ? 'w-full' : 'min-w-[140px]'
          )}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className={cn('flex items-center gap-1', fullWidth ? 'w-full' : 'shrink-0')}>
        <label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="hidden sm:block text-xs font-medium text-slate-500">
          {label}
        </label>
        <input
          type="date"
          id={label.toLowerCase().replace(/\s+/g, '-')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(
            'min-h-11 px-3 text-sm border border-slate-300 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            fullWidth ? 'w-full' : 'min-w-[140px]'
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', fullWidth ? 'w-full' : 'shrink-0')}>
      <label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="hidden sm:block text-xs font-medium text-slate-500">
        {label}
      </label>
      <input
        type="text"
        id={label.toLowerCase().replace(/\s+/g, '-')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          'min-h-11 px-3 text-sm border border-slate-300 rounded-lg bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          fullWidth ? 'w-full' : 'min-w-[140px]'
        )}
      />
    </div>
  );
}
export function ListView<T>({
  title,
  breadcrumbs,
  createAction,
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  filterConfig,
  columns,
  data,
  keyExtractor,
  loading,
  error,
  onRetry,
  emptyTitle = 'No results found',
  emptyMessage = 'Try adjusting your search or filters.',
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  renderCard,
  page,
  totalPages,
  total,
  onPageChange,
  className,
  children,
}: ListViewConfig<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  useRegisterHeaderAction(createAction ?? null);

  const filterDrawer = useFilterDrawer(filterConfig?.initialValues ?? {});

  const initialFilters = filterConfig ? filterConfig.initialValues : {};
  const currentFilters = filterConfig
    ? Object.fromEntries(
        Object.entries(initialFilters).map(([key, value]) => [
          key,
          searchParams.get(key) ?? value,
        ]),
      )
    : {};
  const activeFilters = getActiveFilters(currentFilters, initialFilters);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    }
    else if (filterConfig) {
      updateUrlParams(setSearchParams, { search: value, page: '1' }, searchParams);
    }
  };

  const handleFilterApply = () => {
    if (filterConfig) {
      const params: Record<string, string> = { ...filterDrawer.draft, page: '1' };
      updateUrlParams(setSearchParams, params, searchParams);
      filterDrawer.setOpen(false);
    }
  };

  const handleFilterReset = () => {
    if (filterConfig) {
      filterDrawer.setDraft(filterConfig.initialValues);
    }
  };

  const openFilterDrawer = () => {
    filterDrawer.setDraft(currentFilters);
    filterDrawer.setOpen(true);
  };

  const handleFilterRemove = (key: string) => {
    if (filterConfig) {
      const params: Record<string, string> = { [key]: initialFilters[key] || 'all', page: '1' };
      updateUrlParams(setSearchParams, params, searchParams);
      filterDrawer.setDraft({ ...filterDrawer.draft, [key]: initialFilters[key] || 'all' });
    }
  };

  const handleClearAllFilters = () => {
    if (filterConfig) {
      const params: Record<string, string> = {};
      for (const key of Object.keys(initialFilters)) {
        params[key] = initialFilters[key] || 'all';
      }
      params.page = '1';
      updateUrlParams(setSearchParams, params, searchParams);
      filterDrawer.setDraft(filterConfig.initialValues);
    }
  };

  const headerActions = (() => {
    const actions: React.ReactNode[] = [];
    // createAction and filter button removed from header per requirement
    return actions.length > 0 ? <div className="flex items-center gap-2">{actions}</div> : null;
  })();

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-2">
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="flex-1 min-w-0"
          />
          {filterConfig && (
            <FilterButton
              activeCount={activeFilters.length}
              onClick={openFilterDrawer}
              className="flex shrink-0"
            />
          )}
          {filterConfig && (
            <div className="hidden sm:flex flex-wrap items-center gap-2">
              {Object.entries(filterConfig.fields).map(([key, field]) => (
                <FilterField
                  key={key}
                  label={field.label}
                  type={field.type}
                  value={currentFilters[key] || initialFilters[key] || 'all'}
                  options={field.options}
                  placeholder={field.placeholder}
                  onChange={(value) => {
                    updateUrlParams(setSearchParams, { [key]: value, page: '1' }, searchParams);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {activeFilters.length > 0 && (
          <FilterBar
            filters={activeFilters}
            onRemove={handleFilterRemove}
            onClearAll={handleClearAllFilters}
          />
        )}

        {filterConfig && (
          <FilterDrawer
            open={filterDrawer.open}
            onOpenChange={filterDrawer.setOpen}
            activeCount={activeFilters.length}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            title="Filters"
            applyLabel="Apply filters"
          >
            <div className="space-y-4">
              {Object.entries(filterConfig.fields).map(([key, field]) => (
                <FilterField
                  key={key}
                  label={field.label}
                  type={field.type}
                  value={filterDrawer.draft[key] || initialFilters[key] || 'all'}
                  options={field.options}
                  placeholder={field.placeholder}
                  onChange={(value) => filterDrawer.setField(key as keyof ListViewFilters, value)}
                  fullWidth
                />
              ))}
            </div>
          </FilterDrawer>
        )}
      </div>

      <DataTable<T>
        data={data}
        columns={columns}
        keyExtractor={keyExtractor}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        emptyIcon={emptyIcon}
        emptyActionLabel={emptyActionLabel}
        onEmptyAction={onEmptyAction}
        renderCard={renderCard}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
      {children}
    </div>
  );
}