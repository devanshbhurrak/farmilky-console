import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FilterBar, type ActiveFilter } from '@/components/data/filter-bar';
import { SearchInput } from '@/components/data/search-input';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, formatDate, getId, titleCase } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  type Expense,
  type ExpenseListParams,
} from '@/types/expense';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseSummary,
  useExpenses,
  useUpdateExpense,
} from './hooks';
import type { ExpenseInput } from './schemas';
import { ExpenseForm } from './components/expense-form';
import { ExpenseTable } from './components/expense-table';

const PAGE_SIZE = 20;

function toExpenseInput(e: Expense): ExpenseInput {
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(e.category)
    ? (e.category as ExpenseInput['category'])
    : 'miscellaneous';
  const paymentMethod = (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(
    e.paymentMethod ?? '',
  )
    ? (e.paymentMethod as ExpenseInput['paymentMethod'])
    : 'cash';
  return {
    amount: e.amount,
    category,
    date: typeof e.date === 'string' ? e.date.slice(0, 10) : '',
    description: e.description ?? '',
    paymentMethod,
    receiptReference: e.receiptReference ?? '',
  };
}

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const rawSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const listParams: ExpenseListParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    category: category !== 'all' ? category : undefined,
    startDate: from || undefined,
    endDate: to || undefined,
  };
  const { data, isLoading, isError, refetch } = useExpenses(listParams);
  const summaryQuery = useExpenseSummary({
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    category: category !== 'all' ? category : undefined,
    startDate: from || undefined,
    endDate: to || undefined,
  });

  const items = data?.items ?? [];
  const meta = data?.meta ?? { total: 0, page, limit: PAGE_SIZE, totalPages: 0 };
  const summary = summaryQuery.data;
  const topCategory = (summary?.byCategory ?? []).reduce<
    { category: string; total: number; count: number } | null
  >((best, cur) => (best === null || cur.total > best.total ? cur : best), null);

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);

  const updateUrl = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  };

  const activeFilters: ActiveFilter[] = [];
  if (category !== 'all')
    activeFilters.push({ key: 'category', label: 'Category', value: titleCase(category) });
  if (from) activeFilters.push({ key: 'from', label: 'From', value: formatDate(from) });
  if (to) activeFilters.push({ key: 'to', label: 'To', value: formatDate(to) });

  const handleFormSubmit = (values: ExpenseInput) => {
    if (editing) {
      updateMutation.mutate(
        { id: getId(editing), data: values },
        { onSuccess: () => setSheetOpen(false) },
      );
    } else {
      createMutation.mutate(values, { onSuccess: () => setSheetOpen(false) });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Expenses"
        description="Track operational spending"
        actions={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              <Plus />
              Add expense
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Total</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatCurrency(summary?.total ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Entries</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{summary?.count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Top category</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {topCategory ? titleCase(topCategory.category) : '—'}
            </p>
            {topCategory ? (
              <p className="text-xs text-slate-500">{formatCurrency(topCategory.total)}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput
          value={rawSearch}
          onChange={(v) => updateUrl({ search: v, page: null })}
          placeholder="Search expenses…"
          className="lg:max-w-xs"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={category}
            onChange={(e) =>
              updateUrl({ category: e.target.value === 'all' ? '' : e.target.value, page: null })
            }
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => updateUrl({ from: e.target.value, page: null })}
              aria-label="From date"
              className="w-auto"
            />
            <span className="text-sm text-slate-500">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => updateUrl({ to: e.target.value, page: null })}
              aria-label="To date"
              className="w-auto"
            />
          </div>
        </div>
      </div>
      <FilterBar
        filters={activeFilters}
        onRemove={(key) => updateUrl({ [key]: '', page: null })}
        onClearAll={() => updateUrl({ category: '', from: '', to: '', page: null })}
      />

      <ExpenseTable
        data={items}
        loading={isLoading}
        error={isError ? 'Failed to load expenses' : null}
        onRetry={() => refetch()}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={(next) => updateUrl({ page: String(next) })}
        onEdit={
          isAdmin
            ? (e) => {
                setEditing(e);
                setSheetOpen(true);
              }
            : undefined
        }
        onDelete={isAdmin ? (e) => setDeleting(e) : undefined}
      />

      {isAdmin && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{editing ? 'Edit expense' : 'Add expense'}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <ExpenseForm
                key={editing ? getId(editing) : 'new'}
                defaultValues={editing ? toExpenseInput(editing) : undefined}
                onSubmit={handleFormSubmit}
                submitting={createMutation.isPending || updateMutation.isPending}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete expense?"
        description={
          deleting
            ? `${formatCurrency(deleting.amount)} · ${titleCase(deleting.category)} will be removed.`
            : undefined
        }
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(getId(deleting), {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
