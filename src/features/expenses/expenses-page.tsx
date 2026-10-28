import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleDollarSign, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ListView } from '@/components/data/list-view';
import type { Column } from '@/components/data/data-table';
import { StatCard } from '@/components/data/stat-card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, formatDate, getErrorMessage, getId, titleCase } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from '@/types/expense';
import type { Expense, ExpenseListParams } from '@/types/expense';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseSummary,
  useExpenses,
  useUpdateExpense,
} from './hooks';
import type { ExpenseInput } from './schemas';
import { ExpenseForm } from './components/expense-form';

const PAGE_SIZE = 20;

function toExpenseInput(expense: Expense): ExpenseInput {
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(expense.category)
    ? (expense.category as ExpenseInput['category'])
    : 'miscellaneous';
  const paymentMethod = (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(
    expense.paymentMethod ?? '',
  )
    ? (expense.paymentMethod as ExpenseInput['paymentMethod'])
    : 'cash';
  return {
    amount: expense.amount,
    category,
    date: typeof expense.date === 'string' ? expense.date.slice(0, 10) : '',
    description: expense.description ?? '',
    paymentMethod,
    receiptReference: expense.receiptReference ?? '',
  };
}

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);
  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const filterConfig = {
    fields: {
      category: {
        label: 'Category',
        type: 'select' as const,
        options: [
          { value: 'all', label: 'All categories' },
          ...EXPENSE_CATEGORIES.map((value) => ({ value, label: titleCase(value) })),
        ],
      },
      from: { label: 'From date', type: 'date' as const },
      to: { label: 'To date', type: 'date' as const },
    },
    initialValues: { category: 'all', from: '', to: '' },
  };

  const updateUrl = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const search = debouncedSearch.trim() || undefined;
  const listParams: ExpenseListParams = {
    page,
    limit: PAGE_SIZE,
    search,
    category: category !== 'all' ? category : undefined,
    startDate: from || undefined,
    endDate: to || undefined,
  };
  const query = useExpenses(listParams);
  const summaryQuery = useExpenseSummary({
    search,
    category: category !== 'all' ? category : undefined,
    startDate: from || undefined,
    endDate: to || undefined,
  });
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const saving = createMutation.isPending || updateMutation.isPending;
  const items = query.data?.items ?? [];
  const meta = query.data?.meta ?? { total: 0, page, limit: PAGE_SIZE, totalPages: 0 };
  const summary = summaryQuery.data;
  const topCategory = React.useMemo(
    () => [...(summary?.byCategory ?? [])].sort((a, b) => b.total - a.total)[0],
    [summary?.byCategory],
  );

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const openEdit = React.useCallback((expense: Expense) => {
    setEditing(expense);
    setSheetOpen(true);
  }, []);

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

  const createAction = React.useMemo(
    () =>
      isAdmin ? (
        <Button onClick={openCreate} className="px-3 py-1.5 text-sm">
          <Plus aria-hidden /> Expense
        </Button>
      ) : null,
    [isAdmin, openCreate],
  );

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (category !== 'all') {
    activeFilters.push({ key: 'category', label: 'Category', value: titleCase(category) });
  }
  if (from) activeFilters.push({ key: 'from', label: 'From', value: from });
  if (to) activeFilters.push({ key: 'to', label: 'To', value: to });

  const columns: Column<Expense>[] = [
    {
      header: 'Expense',
      cell: (expense) => (
        <div>
          <p className="font-medium text-slate-900">{expense.description || '—'}</p>
          <p className="text-xs text-slate-500">
            {titleCase(expense.category)} · {titleCase(expense.paymentMethod ?? '—')}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      cell: (expense) => (
        <span className="font-medium text-slate-900">{formatCurrency(expense.amount)}</span>
      ),
    },
    { header: 'Date', cell: (expense) => formatDate(expense.date), hideOnMobile: true },
    {
      header: 'Category',
      cell: (expense) => titleCase(expense.category),
      hideOnMobile: true,
    },
  ];

  if (isAdmin) {
    columns.push({
      header: 'Actions',
      cell: (expense) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Edit expense ${formatCurrency(expense.amount)}`}
            onClick={() => openEdit(expense)}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete expense ${formatCurrency(expense.amount)}`}
            onClick={() => setDeleting(expense)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ),
    });
  }

  return (
    <ListView<Expense>
      title="Expenses"
      createAction={createAction}
      searchPlaceholder="Search expenses..."
      searchValue={rawSearch}
      onSearchChange={(value) => updateUrl({ search: value, page: '1' })}
      filterConfig={filterConfig}
      columns={columns}
      data={items}
      keyExtractor={(expense, index) => getId(expense) || `expense-${index}`}
      loading={query.isLoading}
      error={query.isError ? getErrorMessage(query.error) : null}
      onRetry={() => query.refetch()}
      emptyTitle="No expenses found"
      emptyMessage="Try adjusting your search or filters."
      emptyActionLabel={isAdmin ? 'Add expense' : undefined}
      onEmptyAction={isAdmin ? openCreate : undefined}
      renderCard={(expense) => (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 p-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium text-slate-900">
                {expense.description || 'No description'}
              </p>
              <span className="shrink-0 font-semibold text-slate-900">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {titleCase(expense.category)} · {titleCase(expense.paymentMethod ?? '—')} ·{' '}
              {formatDate(expense.date)}
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Edit expense ${formatCurrency(expense.amount)}`}
                onClick={() => openEdit(expense)}
              >
                <Pencil aria-hidden />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Delete expense ${formatCurrency(expense.amount)}`}
                onClick={() => setDeleting(expense)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}
      page={meta.page}
      totalPages={meta.totalPages}
      total={meta.total}
      onPageChange={(nextPage) => updateUrl({ page: String(nextPage) })}
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Expense summary">
        <StatCard
          label="Total expenses"
          value={
            summaryQuery.isError
              ? 'Unavailable'
              : summaryQuery.isLoading
                ? 'Loading…'
                : formatCurrency(summary?.total)
          }
          icon={<CircleDollarSign className="size-4" aria-hidden />}
        />
        <StatCard
          label="Expense entries"
          value={
            summaryQuery.isError
              ? 'Unavailable'
              : summaryQuery.isLoading
                ? '—'
                : summary?.count ?? 0
          }
          icon={<Receipt className="size-4" aria-hidden />}
        />
        <StatCard
          label="Top category"
          value={
            summaryQuery.isError
              ? 'Unavailable'
              : summaryQuery.isLoading
                ? 'Loading…'
                : topCategory
                  ? titleCase(topCategory.category)
                  : '—'
          }
          icon={<Receipt className="size-4" aria-hidden />}
          subtitle={
            topCategory
              ? `${formatCurrency(topCategory.total)} · ${topCategory.count} entries`
              : undefined
          }
        />
        {summaryQuery.isError && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-3">
            Expense summary failed to load: {getErrorMessage(summaryQuery.error)}
          </p>
        )}
      </section>

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
                submitting={saving}
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
    </ListView>
  );
}
