import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable, type Column } from '@/components/data/data-table';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, getErrorMessage, getId } from '@/lib/utils';
import { INVOICE_STATUSES, type Invoice } from '@/types/invoice';
import { useInvoices } from './hooks';
import { InvoiceCard, customerLabel, periodLabel } from './components/invoice-table';
import { GenerateInvoiceDialog } from './components/generate-invoice-dialog';
import { BulkGenerateDialog } from './components/bulk-generate-dialog';

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = currentMonthYear();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const month = Number(searchParams.get('month') ?? defaults.month);
  const year = Number(searchParams.get('year') ?? defaults.year);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const debouncedSearch = useDebounce(search);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filters = useFilterDrawer({ status });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const shiftMonth = (delta: -1 | 1) => {
    const d = new Date(year, month - 1 + delta, 1);
    const now = new Date();
    const max = new Date(now.getFullYear(), now.getMonth(), 1);
    if (d > max) return;
    const next = new URLSearchParams(searchParams);
    next.set('month', String(d.getMonth() + 1));
    next.set('year', String(d.getFullYear()));
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const atCurrentMonth = month === defaults.month && year === defaults.year;

  const invoicesQuery = useInvoices({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
    month,
    year,
  });

  const invoices = invoicesQuery.data?.items ?? [];

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice',
      cell: (inv) => (
        <button
          type="button"
          onClick={() => navigate(`/invoices/${getId(inv)}`)}
          className="cursor-pointer text-left font-medium text-slate-900 hover:underline"
        >
          {inv.invoiceNumber}
        </button>
      ),
    },
    {
      header: 'Customer',
      cell: (inv) => customerLabel(inv),
    },
    {
      header: 'Period',
      cell: (inv) => periodLabel(inv),
    },
    {
      header: 'Net due',
      cell: (inv) => <span className="font-semibold">{formatCurrency(inv.netAmountDue)}</span>,
    },
    {
      header: 'Status',
      cell: (inv) => <StatusBadge status={String(inv.status)} />,
    },
  ];

  const headerAction = useMemo(
    () => (
      <>
        <Button variant="outline" onClick={() => setBulkOpen(true)} className="min-h-11">
          Bulk generate
        </Button>
        <Button onClick={() => setGenerateOpen(true)} className="min-h-11">
          Generate invoice
        </Button>
      </>
    ),
    [setBulkOpen, setGenerateOpen],
  );
  useRegisterHeaderAction(headerAction);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Invoices" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput
            value={search}
            onChange={(v) => setParam('search', v)}
            placeholder="Search invoices…"
            className="flex-1"
          />
          <FilterButton activeCount={status ? 1 : 0} onClick={filters.openDrawer} />
        </div>
        <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium text-slate-700" aria-live="polite">
              {periodLabel({ billingPeriod: { month, year } } as Invoice)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              disabled={atCurrentMonth}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <Select
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            className="min-h-11"
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={status ? 1 : 0}
        onApply={() => {
          setParam('status', filters.draft.status);
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: '' })}
      >
        <FormField label="Status">
          <Select
            value={filters.draft.status}
            onChange={(e) => filters.setField('status', e.target.value)}
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterDrawer>

      <DataTable<Invoice>
        data={invoices}
        columns={columns}
        keyExtractor={(inv) => getId(inv)}
        loading={invoicesQuery.isPending}
        error={invoicesQuery.isError ? getErrorMessage(invoicesQuery.error) : null}
        onRetry={() => invoicesQuery.refetch()}
        emptyTitle="No invoices found"
        emptyMessage="Generate an invoice or adjust your filters."
        emptyIcon={<Receipt className="size-6" />}
        emptyActionLabel="Generate invoice"
        onEmptyAction={() => setGenerateOpen(true)}
        renderCard={(inv) => (
          <InvoiceCard invoice={inv} onClick={() => navigate(`/invoices/${getId(inv)}`)} />
        )}
        page={page}
        totalPages={invoicesQuery.data?.meta.totalPages ?? 0}
        total={invoicesQuery.data?.meta.total ?? 0}
        onPageChange={(p) => setParam('page', String(p))}
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
