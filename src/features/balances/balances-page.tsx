import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/data/stat-card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, getErrorMessage, getId, todayLocal } from '@/lib/utils';
import type { BalanceSummary } from '@/types/transaction';
import { useBalances, useRecordBalanceAdjustment, useRecordBalancePayment } from './hooks';

function balanceOf(row: BalanceSummary): number {
  const raw = row.accountBalance ?? row.balance ?? 0;
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

function rowUserId(row: BalanceSummary): string {
  const raw = row.userId ?? row.customerId ?? getId(row);
  return typeof raw === 'string' ? raw : String(raw ?? '');
}

function rowName(row: BalanceSummary): string {
  return typeof row.name === 'string' && row.name ? row.name : 'Customer';
}

function CollectBalanceForm({ row, onSuccess }: { row: BalanceSummary; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ amount: number; date: string; transactionId: string; notes: string }>({
    defaultValues: {
      amount: balanceOf(row) > 0 ? Math.round(balanceOf(row) * 100) / 100 : 0,
      date: todayLocal(),
      transactionId: '',
      notes: '',
    },
  });
  const recordPayment = useRecordBalancePayment();

  return (
    <form
      onSubmit={handleSubmit((values) =>
        recordPayment.mutate(
          {
            userId: rowUserId(row),
            amount: Number(values.amount),
            date: values.date,
            transactionId: values.transactionId || undefined,
            notes: values.notes || undefined,
          },
          {
            onSuccess: () => onSuccess(),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        ),
      )}
      className="flex flex-col gap-4"
    >
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...register('amount', { valueAsNumber: true, min: { value: 0.01, message: 'Amount must be greater than 0' } })}
          className="min-h-11"
        />
      </FormField>
      <FormField label="Date" required error={errors.date?.message}>
        <Input type="date" {...register('date', { required: 'Date is required' })} className="min-h-11" />
      </FormField>
      <FormField label="Transaction ID" error={errors.transactionId?.message}>
        <Input placeholder="UPI / bank reference (optional)" {...register('transactionId')} className="min-h-11" />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Optional note" {...register('notes')} />
      </FormField>
      <DialogFooter>
        <Button type="submit" loading={isSubmitting || recordPayment.isPending} className="min-h-11">
          Record payment
        </Button>
      </DialogFooter>
    </form>
  );
}

function AdjustBalanceForm({ row, onSuccess }: { row: BalanceSummary; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ type: 'credit_adjustment' | 'debit_adjustment'; amount: number; date: string; notes: string }>({
    defaultValues: { type: 'credit_adjustment', amount: 0, date: todayLocal(), notes: '' },
  });
  const recordAdjustment = useRecordBalanceAdjustment();

  return (
    <form
      onSubmit={handleSubmit((values) =>
        recordAdjustment.mutate(
          {
            userId: rowUserId(row),
            type: values.type,
            amount: Number(values.amount),
            date: values.date,
            notes: values.notes || undefined,
          },
          {
            onSuccess: () => onSuccess(),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        ),
      )}
      className="flex flex-col gap-4"
    >
      <FormField label="Adjustment type" required error={errors.type?.message}>
        <Select {...register('type')} className="min-h-11">
          <option value="credit_adjustment">Credit adjustment (reduces due)</option>
          <option value="debit_adjustment">Debit adjustment (increases due)</option>
        </Select>
      </FormField>
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...register('amount', { valueAsNumber: true, min: { value: 0.01, message: 'Amount must be greater than 0' } })}
          className="min-h-11"
        />
      </FormField>
      <FormField label="Date" required error={errors.date?.message}>
        <Input type="date" {...register('date', { required: 'Date is required' })} className="min-h-11" />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Reason for adjustment" {...register('notes')} />
      </FormField>
      <DialogFooter>
        <Button type="submit" loading={isSubmitting || recordAdjustment.isPending} className="min-h-11">
          Save adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function BalancesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const debouncedSearch = useDebounce(search);

  const [collectRow, setCollectRow] = useState<BalanceSummary | null>(null);
  const [adjustRow, setAdjustRow] = useState<BalanceSummary | null>(null);

  const balancesQuery = useBalances({
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  });

  const rows = useMemo(() => balancesQuery.data?.items ?? [], [balancesQuery.data]);

  const stats = useMemo(() => {
    let debt = 0;
    let advances = 0;
    for (const r of rows) {
      const b = balanceOf(r);
      if (b > 0) debt += b;
      else advances += Math.abs(b);
    }
    return { debt, advances, count: balancesQuery.data?.meta.total ?? rows.length };
  }, [rows, balancesQuery.data]);

  const columns: Column<BalanceSummary>[] = [
    {
      header: 'Customer',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Avatar name={rowName(r)} className="size-8" />
          <div>
            <p className="font-medium text-slate-900">{rowName(r)}</p>
            {typeof r.phone === 'string' && r.phone ? (
              <p className="text-xs text-slate-500">{r.phone}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      header: 'Balance',
      cell: (r) => {
        const b = balanceOf(r);
        return (
          <span className={`font-semibold ${b > 0 ? 'text-red-600' : b < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {formatCurrency(b)}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => setCollectRow(r)}>
            Collect
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdjustRow(r)}>
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Balances" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total debt" value={formatCurrency(stats.debt)} valueClassName="text-red-600" />
        <StatCard label="Total advances" value={formatCurrency(stats.advances)} valueClassName="text-emerald-600" />
        <StatCard label="Customers" value={stats.count} />
      </div>

      <SearchInput
        value={search}
        onChange={(v) => {
          const next = new URLSearchParams(searchParams);
          if (!v) next.delete('search');
          else next.set('search', v);
          next.delete('page');
          setSearchParams(next, { replace: true });
        }}
        placeholder="Search customers…"
        className="sm:max-w-xs"
      />

      <DataTable<BalanceSummary>
        data={rows}
        columns={columns}
        keyExtractor={(r, i) => rowUserId(r) || String(i)}
        loading={balancesQuery.isPending}
        error={balancesQuery.isError ? getErrorMessage(balancesQuery.error) : null}
        onRetry={() => balancesQuery.refetch()}
        emptyTitle="No balances found"
        emptyMessage="Try adjusting your search."
        emptyIcon={<Scale className="size-6" />}
        renderCard={(r) => {
          const b = balanceOf(r);
          return (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={rowName(r)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{rowName(r)}</p>
                    {typeof r.phone === 'string' && r.phone ? (
                      <p className="text-xs text-slate-500">{r.phone}</p>
                    ) : null}
                  </div>
                  <p className={`text-base font-semibold ${b > 0 ? 'text-red-600' : b < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {formatCurrency(b)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="min-h-11 flex-1" onClick={() => setCollectRow(r)}>
                    Collect
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => setAdjustRow(r)}>
                    Adjust
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }}
        page={page}
        totalPages={balancesQuery.data?.meta.totalPages ?? 0}
        total={balancesQuery.data?.meta.total ?? 0}
        onPageChange={(p) => {
          const next = new URLSearchParams(searchParams);
          next.set('page', String(p));
          setSearchParams(next, { replace: true });
        }}
      />

      <Dialog open={Boolean(collectRow)} onOpenChange={(open) => { if (!open) setCollectRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect payment{collectRow ? ` — ${rowName(collectRow)}` : ''}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {collectRow ? <CollectBalanceForm row={collectRow} onSuccess={() => setCollectRow(null)} /> : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(adjustRow)} onOpenChange={(open) => { if (!open) setAdjustRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust balance{adjustRow ? ` — ${rowName(adjustRow)}` : ''}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {adjustRow ? <AdjustBalanceForm row={adjustRow} onSuccess={() => setAdjustRow(null)} /> : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
