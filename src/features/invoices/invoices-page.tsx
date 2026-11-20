import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers, Plus, Receipt } from 'lucide-react';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable, type Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { cn, formatCurrency, getErrorMessage, getId } from '@/lib/utils';
import { INVOICE_STATUSES, type Invoice } from '@/types/invoice';
import { useInvoices } from './hooks';
import { InvoiceCard, customerLabel, periodLabel } from './components/invoice-table';
import { GenerateInvoiceDialog } from './components/generate-invoice-dialog';
import { BulkGenerateDialog } from './components/bulk-generate-dialog';

const PAGE_SIZE = 20;
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

/* ---------- helpers ---------- */

/** Reads month/year from the URL and clamps to a valid, non-future billing month. */
function resolvePeriod(rawMonth: string | null, rawYear: string | null) {
  const now = new Date();
  const current = { month: now.getMonth() + 1, year: now.getFullYear() };
  const month = Number(rawMonth);
  const year = Number(rawYear);

  const valid =
    Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000;
  const future = year > current.year || (year === current.year && month > current.month);

  if (!valid || future) return { ...current, isCurrent: true };
  return { month, year, isCurrent: month === current.month && year === current.year };
}

function formatStatus(s: string) {
  const text = s.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- local components ---------- */

function MonthStepper({
  month,
  year,
  atCurrent,
  onShift,
}: {
  month: number;
  year: number;
  atCurrent: boolean;
  onShift: (delta: -1 | 1) => void;
}) {
  const arrow =
    'grid size-9 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="flex h-11 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-1">
      <button type="button" className={arrow} aria-label="Previous month" onClick={() => onShift(-1)}>
        <ChevronLeft className="size-4" />
      </button>
      <span
        className="min-w-[5.5rem] text-center text-sm font-medium tabular-nums text-slate-800"
        aria-live="polite"
      >
        {monthFormatter.format(new Date(year, month - 1, 1))}
      </span>
      <button
        type="button"
        className={arrow}
        aria-label="Next month"
        disabled={atCurrent}
        onClick={() => onShift(1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function StatusChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ['', ...INVOICE_STATUSES] as string[];

  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((s) => {
        const active = s === value;
        return (
          <button
            key={s || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {s ? formatStatus(s) : 'All'}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const { month, year, isCurrent: atCurrentMonth } = resolvePeriod(
    searchParams.get('month'),
    searchParams.get('year'),
  );
  const page = Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1);
  const debouncedSearch = useDebounce(search);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const updateParams = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!keepPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const shiftMonth = (delta: -1 | 1) => {
    if (delta === 1 && atCurrentMonth) return;
    const d = new Date(year, month - 1 + delta, 1);
    updateParams({ month: String(d.getMonth() + 1), year: String(d.getFullYear()) });
  };

  const hasFilters = Boolean(search || status);
  const clearFilters = () => updateParams({ search: '', status: '' });

  const invoicesQuery = useInvoices({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status || undefined,
    month,
    year,
  });

  const invoices = invoicesQuery.data?.items ?? [];
  const total = invoicesQuery.data?.meta.total ?? 0;
  const totalPages = invoicesQuery.data?.meta.totalPages ?? 0;

  // Jump back to the last valid page if the current one no longer exists.
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) updateParams({ page: String(totalPages) }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, page]);

  const columns = useMemo<Column<Invoice>[]>(
    () => [
      {
        header: 'Invoice',
        cell: (inv) => (
          <button
            type="button"
            onClick={() => navigate(`/invoices/${getId(inv)}`)}
            className="cursor-pointer text-left font-medium text-slate-900 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {inv.invoiceNumber}
          </button>
        ),
      },
      { header: 'Customer', cell: (inv) => customerLabel(inv) },
      { header: 'Period', cell: (inv) => periodLabel(inv) },
      {
        header: 'Net due',
        cell: (inv) => (
          <span className="font-semibold tabular-nums">{formatCurrency(inv.netAmountDue)}</span>
        ),
      },
      { header: 'Status', cell: (inv) => <StatusBadge status={String(inv.status)} /> },
    ],
    [navigate],
  );

  const headerAction = useMemo(
    () => (
      <>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          aria-label="Bulk generate"
          onClick={() => setBulkOpen(true)}
        >
          <Layers className="size-4" />
          <span className="hidden sm:inline">Bulk generate</span>
        </Button>
        <Button
          type="button"
          className="min-h-11 gap-2"
          aria-label="Generate invoice"
          onClick={() => setGenerateOpen(true)}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Generate invoice</span>
        </Button>
      </>
    ),
    [],
  );
  useRegisterHeaderAction(headerAction);

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={(v) => updateParams({ search: v })}
            placeholder="Search by invoice or customer…"
            className="flex-1"
          />
          <MonthStepper
            month={month}
            year={year}
            atCurrent={atCurrentMonth}
            onShift={shiftMonth}
          />
        </div>
        <StatusChips value={status} onChange={(v) => updateParams({ status: v })} />
      </div>

      <DataTable<Invoice>
        data={invoices}
        columns={columns}
        keyExtractor={(inv) => getId(inv)}
        loading={invoicesQuery.isPending}
        error={invoicesQuery.isError ? getErrorMessage(invoicesQuery.error) : null}
        onRetry={() => invoicesQuery.refetch()}
        emptyTitle="No invoices found"
        emptyMessage={
          hasFilters
            ? 'Nothing matches your search or status filter.'
            : 'No invoices have been generated for this month.'
        }
        emptyIcon={<Receipt className="size-6" />}
        emptyActionLabel={hasFilters ? 'Clear filters' : 'Generate invoice'}
        onEmptyAction={hasFilters ? clearFilters : () => setGenerateOpen(true)}
        renderCard={(inv) => (
          <InvoiceCard invoice={inv} onClick={() => navigate(`/invoices/${getId(inv)}`)} />
        )}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => updateParams({ page: String(p) }, true)}
      />

      <GenerateInvoiceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={(id) => {
          if (id) navigate(`/invoices/${id}`);
        }}
      />
      <BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}