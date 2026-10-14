import { Landmark, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/data/data-table';
import { formatCurrency, formatDate, getId, titleCase } from '@/lib/utils';
import type { Expense } from '@/types/expense';

interface ExpenseTableProps {
  data: Expense[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

function renderExpenseCard(expense: Expense) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary">{titleCase(expense.category)}</Badge>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(expense.amount)}
          </span>
        </div>
        <p className="truncate text-sm text-slate-700">{expense.description || 'No description'}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{formatDate(expense.date)}</span>
          <span>·</span>
          <span>{titleCase(expense.paymentMethod ?? '—')}</span>
          {expense.receiptReference ? (
            <>
              <span>·</span>
              <span className="truncate">Receipt: {expense.receiptReference}</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpenseTable({
  data,
  loading,
  error,
  onRetry,
  page,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const columns: Column<Expense>[] = [
    {
      header: 'Date',
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span>,
    },
    {
      header: 'Category',
      cell: (e) => <Badge variant="secondary">{titleCase(e.category)}</Badge>,
    },
    {
      header: 'Description',
      cell: (e) => (
        <span className="block max-w-56 truncate">{e.description || '—'}</span>
      ),
    },
    {
      header: 'Method',
      cell: (e) => titleCase(e.paymentMethod ?? null),
    },
    {
      header: 'Receipt',
      cell: (e) => <span className="block max-w-32 truncate">{e.receiptReference || '—'}</span>,
    },
    {
      header: 'Amount',
      cell: (e) => <span className="font-semibold text-slate-900">{formatCurrency(e.amount)}</span>,
    },
  ];
  if (onEdit || onDelete) {
    columns.push({
      header: 'Actions',
      cell: (e) => (
        <div className="flex items-center gap-1">
          {onEdit ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(e)}
              aria-label={`Edit expense ${formatCurrency(e.amount)}`}
            >
              <Pencil />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(e)}
              aria-label={`Delete expense ${formatCurrency(e.amount)}`}
            >
              <Trash2 className="text-red-600" />
            </Button>
          ) : null}
        </div>
      ),
    });
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      keyExtractor={(e, i) => getId(e) || `expense-${i}`}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No expenses found"
      emptyMessage="Try adjusting your search or filters."
      emptyIcon={<Landmark className="size-6" />}
      renderCard={renderExpenseCard}
      page={page}
      totalPages={totalPages}
      total={total}
      onPageChange={onPageChange}
    />
  );
}
