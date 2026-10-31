import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Pause, Play, XCircle, Package, Clock, Truck, Phone, Mail, User,
  Pencil, Edit2, IndianRupee, CalendarDays, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Repeat2, PlusCircle, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/data/stat-card';
import { StatusBadge } from '@/components/data/status-badge';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, getName } from '@/lib/utils';
import { useSubscription, useUpdateSubscription, useUpdateSubscriptionStatus, useRecordSubscriptionOutcome, useDeleteHistoryEntry } from './hooks';
import { slotConfigOf } from './api';
import { outcomeSchema } from './schemas';
import type { SubscriptionInput } from './schemas';
import { SubscriptionForm } from './components/subscription-form';
import { ScheduleConfig } from './components/schedule-config';

const SCHEDULE_LABEL: Record<string, string> = {
  daily: 'Daily', alternate: 'Every Other Day', weekly: 'Weekly', custom: 'Custom',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_META: Record<string, { color: string; bg: string; text: string; icon: React.ElementType }> = {
  active:    { color: 'var(--success)',  bg: 'var(--success-bg)',  text: 'var(--success-text)',  icon: CheckCircle2 },
  paused:    { color: 'var(--warning)',  bg: 'var(--warning-bg)',  text: 'var(--warning-text)',  icon: Clock },
  cancelled: { color: 'var(--danger)',   bg: 'var(--danger-bg)',   text: 'var(--danger-text)',   icon: XCircle },
};

const CHARGEABLE_STATUSES = new Set(['delivered', 'partial', 'extra']);

const HISTORY_STATUS_COLOR: Record<string, { dot: string; text: string }> = {
  delivered: { dot: 'var(--success)', text: 'var(--success-text)' },
  failed:    { dot: 'var(--danger)',  text: 'var(--danger-text)' },
  skipped:   { dot: 'var(--warning)', text: 'var(--warning-text)' },
};

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [historyForm, setHistoryForm] = useState<any>(() => ({
    deliveryDate: new Date().toISOString().slice(0, 10),
    slot: undefined,
    status: 'delivered',
    actualQuantity: undefined,
    reason: '',
    notes: '',
  }));
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});

  const detailQuery = useSubscription(id);
  const updateMutation = useUpdateSubscription();
  const statusMutation = useUpdateSubscriptionStatus();
  const recordOutcome = useRecordSubscriptionOutcome();
  const deleteEntry = useDeleteHistoryEntry();

  const now = new Date();

  const subscription = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !subscription) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <ErrorState message={getErrorMessage(detailQuery.error, 'Subscription not found')} onRetry={() => detailQuery.refetch()} />
      </div>
    );
  }

  const history = subscription.history ?? subscription.deliveries ?? [];
  const unit = typeof subscription.productId === 'object' ? (subscription.productId.unit ?? 'unit') : 'unit';
  const effectivePrice = subscription.pricePerPacket ??
    (subscription.quantityPerDelivery > 0
      ? subscription.totalPricePerDelivery / subscription.quantityPerDelivery
      : 0);
  const listPrice = typeof subscription.productId === 'object'
    ? subscription.productId.price ?? null
    : null;
  const isCustomPrice = subscription.pricePerPacket != null && listPrice != null &&
    subscription.pricePerPacket !== listPrice;
  const statusMeta = STATUS_META[subscription.status] ?? STATUS_META.active;
  const StatusIcon = statusMeta.icon;
  const scheduleLabel = SCHEDULE_LABEL[subscription.deliverySchedule] ?? subscription.deliverySchedule;
  const slotConfig = slotConfigOf(subscription);
  const isMultiSlot = slotConfig.length > 1;

  const totalDelivered = history.filter((d: any) => (d.status || 'delivered') === 'delivered').length;

  const currentCalMonth = now.getMonth();
  const currentCalYear = now.getFullYear();
  const currentMonthDeliveries = history.filter((d: any) => {
    const date = new Date(d.deliveryDate);
    return date.getMonth() === currentCalMonth && date.getFullYear() === currentCalYear;
  });
  const currentMonthCharges = currentMonthDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
  const previousMonthCharges = Math.max(0, (subscription.pendingAmount || 0) - currentMonthCharges);

  const selectedMonthDeliveries = [...history]
    .filter((d: any) => {
      const date = new Date(d.deliveryDate);
      return date.getMonth() === historyMonth.month && date.getFullYear() === historyMonth.year;
    })
    .reverse();

  const selectedMonthTotal = selectedMonthDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
  const selectedMonthQty = selectedMonthDeliveries
    .filter((d: any) => CHARGEABLE_STATUSES.has((d.status || 'delivered')))
    .reduce((sum, d: any) => sum + Number(d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0), 0);

  const subStartDate = subscription.startDate ? new Date(subscription.startDate) : null;
  let earliestMonth = subStartDate ? { month: subStartDate.getMonth(), year: subStartDate.getFullYear() } : { month: currentCalMonth, year: currentCalYear };
  if (history.length > 0) {
    for (const d of history) {
      const date = new Date(d.deliveryDate);
      if (isNaN(date.getTime())) continue;
      if (date.getFullYear() < earliestMonth.year || (date.getFullYear() === earliestMonth.year && date.getMonth() < earliestMonth.month)) {
        earliestMonth = { month: date.getMonth(), year: date.getFullYear() };
      }
    }
  }
  const atEarliestMonth =
    historyMonth.year < earliestMonth.year ||
    (historyMonth.year === earliestMonth.year && historyMonth.month <= earliestMonth.month);
  const isCurrentMonth = historyMonth.month === currentCalMonth && historyMonth.year === currentCalYear;


  const handleStatus = (status: string) => {
    if (!id) return;
    statusMutation.mutate({ id, status }, { onSuccess: () => { setEditOpen(false); detailQuery.refetch(); } });
  };

  // Scheduled quantity for a given slot falls back to the subscription's
  // overall quantity when that slot has no per-slot row.
  const scheduledQtyOf = (slot?: string) =>
    (slot ? slotConfig.find((s) => s.slot === slot)?.quantityPerDelivery : undefined) ??
    subscription.quantityPerDelivery ??
    subscription.quantityPerDay ??
    0;

  const stepMonth = (direction: number) => {
    setHistoryMonth((prev) => {
      let m = prev.month + direction;
      let y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { month: m, year: y };
    });
  };

  const handleHistorySave = (values: any) => {
    if (!id) return;
    const parsed = outcomeSchema.safeParse({
      deliveryDate: values.deliveryDate,
      slot: values.slot,
      status: values.status,
      actualQuantity:
        values.actualQuantity === '' || values.actualQuantity === undefined || values.actualQuantity === null
          ? undefined
          : Number(values.actualQuantity),
      reason: values.reason || undefined,
      notes: values.notes || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setHistoryErrors(fieldErrors);
      return;
    }
    setHistoryErrors({});
    recordOutcome.mutate({ id, data: parsed.data }, {
      onSuccess: () => {
        setHistoryModalOpen(false);
        detailQuery.refetch();
        const saved = new Date(parsed.data.deliveryDate);
        if (!isNaN(saved.getTime())) setHistoryMonth({ month: saved.getMonth(), year: saved.getFullYear() });
      },
    });
  };

  const openAddHistory = () => {
    setHistoryErrors({});
    setEditingEntry(null);
    setHistoryForm({
      deliveryDate: now.toISOString().slice(0, 10),
      slot: isMultiSlot ? (slotConfig[0]?.slot ?? 'morning') : undefined,
      status: 'delivered',
      actualQuantity: undefined,
      reason: '',
      notes: '',
    });
    setHistoryModalOpen(true);
  };

  const openEditHistory = (entry: any) => {
    setHistoryErrors({});
    setEditingEntry(entry);
    setHistoryForm({
      deliveryDate: entry.deliveryDate?.slice(0, 10) ?? '',
      slot: entry.deliverySlot ?? entry.slot ?? undefined,
      status: entry.status ?? 'delivered',
      actualQuantity: entry.actualQuantity ?? entry.quantity,
      reason: entry.reason ?? '',
      notes: entry.notes ?? '',
    });
    setHistoryModalOpen(true);
  };

  const openDeleteHistory = (entry: any) => {
    setDeleteEntryTarget(entry);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteHistory = () => {
    if (!id || !deleteEntryTarget?.id) return;
    deleteEntry.mutate({ id, entryId: deleteEntryTarget.id }, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setDeleteEntryTarget(null);
        detailQuery.refetch();
      },
    });
  };

  const handleEdit = (values: SubscriptionInput) => {
    if (!id) return;
    updateMutation.mutate({ id, data: values }, { onSuccess: () => { setEditOpen(false); detailQuery.refetch(); } });
  };

  const renderHistoryRow = (d: any, i: number) => {
    const s = d.status || 'delivered';
    const colors = HISTORY_STATUS_COLOR[s] || HISTORY_STATUS_COLOR.delivered;
    const actual = d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0;
    return (
      <div key={d.id ?? i} className="sd-history-row flex items-start gap-3 relative pb-3 last:pb-0">
        <div className="sd-history-dot flex size-3 shrink-0 items-center justify-center rounded-full mt-1" style={{ background: colors.dot, border: `2px solid #ffffff`, boxShadow: `0 0 0 2px ${colors.dot}` }} />
        <div className="sd-history-body flex-1 min-w-0">
          <div className="sd-history-top flex items-baseline justify-between gap-2">
            <span className="sd-history-date text-xs font-bold text-slate-900 whitespace-nowrap">{formatDate(d.deliveryDate)}</span>
            <div className="flex items-center gap-2">
              <span className="sd-history-amount text-xs font-bold text-slate-900 whitespace-nowrap">{formatCurrency(d.amount)}</span>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => openEditHistory(d)} aria-label="Edit entry">
                <Pencil size={12} />
              </button>
              <button type="button" className="text-red-500 hover:text-red-700" onClick={() => openDeleteHistory(d)} aria-label="Delete entry">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="sd-history-meta flex items-center gap-2 mt-1 flex-wrap text-xs">
            <span className="sd-history-qty text-slate-500">{actual} {unit}</span>
            <StatusBadge status={s} className="size-auto" />
            {d.reason && <span className="sd-history-reason text-xs text-slate-400 italic">{d.reason}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view-stack sd-page flex flex-col gap-4 p-3 sm:p-4">

      {/* ── Top bar ───────────────────────────────────── */}
      <PageHeader
        title={getName(subscription.productId, subscription.productName ?? 'Subscription')}
        breadcrumbs={[{ label: 'Subscriptions', path: '/subscriptions' }, { label: getName(subscription.productId, subscription.productName ?? 'Subscription') }]}
      />

      {/* ── Hero card (desktop only) ───────────────────────── */}
      <div className="sd-hero rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hidden lg:block">
        <div className="sd-hero-product flex items-center gap-4 p-4 border-b border-slate-200">
          <div className="sd-hero-product-icon flex size-12 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
            {typeof subscription.productId === 'object' && subscription.productId.image
              ? <img src={subscription.productId.image} alt={subscription.productName} className="w-full h-full object-contain" />
              : <Package size={22} strokeWidth={1.5} className="text-slate-500" />
            }
          </div>
          <div className="sd-hero-product-info flex-1 min-w-0">
            <div className="sd-hero-top flex items-center gap-3 mb-1">
              <h1 className="sd-hero-name text-xl font-extrabold text-slate-900 tracking-tight leading-none truncate">{getName(subscription.productId, subscription.productName ?? 'Unknown Product')}</h1>
              <span className="sd-status-badge inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase whitespace-nowrap" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                <StatusIcon size={12} strokeWidth={2} />
                <span>{subscription.status}</span>
              </span>
              <button type="button" className="icon-button p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors" onClick={() => setEditOpen(true)} title="Edit subscription" aria-label="Edit subscription">
                <Edit2 size={16} />
              </button>
            </div>
            <p className="sd-hero-meta text-xs text-slate-500">
              {getName(subscription.userId, subscription.customerName ?? 'Unknown')}
              {subscription.customerPhone && <> &middot; {subscription.customerPhone}</>}
              &nbsp;&middot;&nbsp;Since {formatDate(subscription.startDate)}
            </p>
          </div>
        </div>
        <div className="sd-hero-stats flex items-center px-4 py-3 gap-0">
          <div className="sd-hero-stat flex flex-col items-center gap-1 text-center flex-1">
            <span className="sd-hero-stat-label text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">Daily</span>
            <span className="sd-hero-stat-value text-base font-extrabold text-slate-900">{formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}</span>
          </div>
          <div className="sd-hero-stat-divider w-[1px] h-8 bg-slate-200 mx-3" />
          <div className="sd-hero-stat flex flex-col items-center gap-1 text-center flex-1">
            <span className="sd-hero-stat-label text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">Qty / Day</span>
            <span className="sd-hero-stat-value text-base font-extrabold text-slate-900">{subscription.quantityPerDelivery ?? subscription.quantityPerDay} {unit}</span>
          </div>
          <div className="sd-hero-stat-divider w-[1px] h-8 bg-slate-200 mx-3" />
          <div className="sd-hero-stat flex flex-col items-center gap-1 text-center flex-1">
            <span className="sd-hero-stat-label text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">Schedule</span>
            <span className="sd-hero-stat-value text-base font-extrabold text-slate-900">{scheduleLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Mobile summary card ───────────────────────── */}
      <div className="sd-summary-card rounded-xl border border-slate-200 bg-white shadow-sm p-4 lg:hidden">
        <div className="sd-summary-product flex items-center gap-3">
          <div className="sd-summary-product-icon flex size-10 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
            <Package size={18} strokeWidth={1.5} className="text-slate-500" />
          </div>
          <div className="sd-summary-info flex-1 min-w-0">
            <p className="sd-summary-name text-sm font-bold text-slate-900 leading-tight">{getName(subscription.productId, subscription.productName ?? 'Unknown Product')}</p>
            <p className="sd-summary-since inline-flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <User size={10} /> {getName(subscription.userId, subscription.customerName ?? 'Unknown')} &nbsp;&middot;&nbsp; Since {formatDate(subscription.startDate)}
            </p>
          </div>
          <button type="button" className="icon-button p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setEditOpen(true)} title="Edit subscription" aria-label="Edit subscription">
            <Edit2 size={16} />
          </button>
        </div>
        <div className="sd-summary-chips flex gap-2 flex-wrap mt-1">
          <span className="sd-chip inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
            <Repeat2 size={11} /> {scheduleLabel}
          </span>
          <span className="sd-chip inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
            <Package size={11} /> {subscription.quantityPerDelivery ?? subscription.quantityPerDay} {unit}/day
          </span>
          <span className="sd-chip sd-chip--money inline-flex items-center gap-1 rounded-full bg-success-bg border-success/20 px-2.5 py-1 text-xs font-semibold text-success whitespace-nowrap">
            <IndianRupee size={11} /> {formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}/day
          </span>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────── */}
      <div className="sd-stats-row grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard icon={<IndianRupee size={14} strokeWidth={1.75} />} label="Daily Value" value={formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)} />
        <StatCard icon={<Truck size={14} strokeWidth={1.75} />} label="Deliveries" value={totalDelivered} valueClassName="var(--color-primary)" subtitle={`of ${history.length} total`} />
        <StatCard icon={<IndianRupee size={14} strokeWidth={1.75} />} label="This Month" value={formatCurrency(currentMonthCharges)} valueClassName={currentMonthCharges > 0 ? 'var(--color-primary)' : 'var(--text-muted)'} subtitle={`${currentMonthDeliveries.length} deliveries`} />
        <StatCard icon={<AlertCircle size={14} strokeWidth={1.75} />} label="Total Pending Due" value={formatCurrency(subscription.pendingAmount || 0)} valueClassName={(subscription.pendingAmount || 0) > 0 ? 'var(--danger)' : 'var(--success)'} subtitle={(subscription.pendingAmount || 0) > 0 ? 'Outstanding' : 'All clear'} />
        <StatCard icon={<CalendarDays size={14} strokeWidth={1.75} />} label="Next Delivery" value={subscription.nextDeliveryDate ? formatDate(subscription.nextDeliveryDate) : '—'} />
      </div>

      {/* ── Monthly financial summary banner ────────────────── */}
      {(currentMonthCharges > 0 || previousMonthCharges > 0) && (
        <div className="sd-financial-summary rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="sd-fin-row flex items-center justify-between border-b border-slate-100 px-4 py-2 gap-4">
            <span className="sd-fin-label text-xs text-slate-500 font-medium">{MONTH_NAMES[currentCalMonth]} {currentCalYear} charges</span>
            <span className="sd-fin-value text-sm font-semibold text-slate-900">{formatCurrency(currentMonthCharges)}</span>
          </div>
          {previousMonthCharges > 0 && (
            <div className="sd-fin-row sd-fin-row--dues flex items-center justify-between bg-warning-bg px-4 py-2 gap-4">
              <span className="sd-fin-label text-xs text-warning font-semibold">Previous outstanding dues</span>
              <span className="sd-fin-value sd-fin-value--danger text-sm font-bold text-red-600">{formatCurrency(previousMonthCharges)}</span>
            </div>
          )}
          <div className="sd-fin-row sd-fin-row--total flex items-center justify-between bg-slate-50 px-4 py-2 gap-4 border-t border-slate-100">
            <span className="sd-fin-label text-xs font-bold uppercase tracking-wider text-slate-500">Total pending</span>
            <span className="sd-fin-value sd-fin-value--bold text-sm font-extrabold text-slate-900">{formatCurrency(Math.max(0, subscription.pendingAmount || 0))}</span>
          </div>
        </div>
      )}

      {/* ── Main grid ─────────────────────────────────── */}
      <div className="sd-grid grid gap-4 lg:grid-cols-[300px_1fr]">

        {/* LEFT — plan + customer */}
        <div className="sd-col flex flex-col gap-3">

          {/* Plan details */}
          <div className="sd-card rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="sd-card-header flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="sd-card-title inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Package size={12} className="sd-card-title-icon text-slate-500" /> Plan Details
              </span>
            </div>
            <div className="sd-plan-rows divide-y divide-slate-100">
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Product</span>
                <span className="sd-plan-val text-sm font-semibold text-slate-900 text-right">{getName(subscription.productId, subscription.productName ?? '—')}</span>
              </div>
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Schedule</span>
                <span className="sd-plan-val text-sm font-semibold text-slate-900 text-right">{scheduleLabel}</span>
              </div>
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Quantity / Day</span>
                <span className="sd-plan-val text-sm font-semibold text-slate-900 text-right">{subscription.quantityPerDelivery ?? subscription.quantityPerDay} {unit}</span>
              </div>
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Rate / {unit}</span>
                <span className="sd-plan-val text-sm font-semibold text-slate-900 text-right flex items-center gap-1.5">
                  {formatCurrency(effectivePrice)}
                  {isCustomPrice && <span className="sd-custom-tag inline-flex items-center gap-1 rounded-full bg-warning-bg border-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">Custom</span>}
                </span>
              </div>
              {isCustomPrice && listPrice != null && (
                <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">List Price</span>
                  <span className="sd-plan-val text-sm font-normal text-slate-400 text-right line-through">{formatCurrency(listPrice)} / {unit}</span>
                </div>
              )}
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5 border-b-0">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Daily Total</span>
                <span className="sd-plan-val text-sm font-extrabold text-primary-600 text-right">{formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}</span>
              </div>
              <div className="sd-plan-row flex items-baseline justify-between gap-4 px-4 py-2.5 border-b-0 last:border-0">
                <span className="sd-plan-key text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">Start Date</span>
                <span className="sd-plan-val text-sm font-semibold text-slate-900 text-right">{formatDate(subscription.startDate)}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="sd-card rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="sd-card-header flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="sd-card-title inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <User size={12} className="sd-card-title-icon text-slate-500" /> Customer
              </span>
              <a href={`/customers/${typeof subscription.userId === 'object' ? subscription.userId.id : subscription.userId}`} className="sd-card-link text-xs font-semibold text-primary-600 hover:underline">View profile</a>
            </div>
            <div className="sd-card-body p-4">
              <p className="sd-customer-name text-base font-bold text-slate-900 mb-2">{getName(subscription.userId, subscription.customerName ?? 'Unknown')}</p>
              <div className="sd-contact-rows flex flex-col gap-1">
                {subscription.customerPhone && (
                  <div className="sd-contact-row flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={14} className="sd-contact-icon text-slate-500" /> <span>{subscription.customerPhone}</span>
                  </div>
                )}
                {subscription.customerEmail && (
                  <div className="sd-contact-row flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={14} className="sd-contact-icon text-slate-500" /> <span>{subscription.customerEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="sd-card rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="sd-card-header px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="sd-card-title text-xs font-bold uppercase tracking-wider text-slate-500">Subscription Actions</span>
            </div>
            <div className="sd-card-body p-4">
              <div className="sd-status-actions grid grid-cols-2 gap-2">
                {subscription.status !== 'active' && (
                  <button type="button" className="btn bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-3 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[36px]" onClick={() => { handleStatus('active'); setEditOpen(false); }}>
                    <Play size={14} className="text-green-600" /> Activate
                  </button>
                )}
                {subscription.status === 'active' && (
                  <button type="button" className="btn bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-lg px-3 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[36px]" onClick={() => { handleStatus('paused'); setEditOpen(false); }}>
                    <Pause size={14} className="text-amber-600" /> Pause
                  </button>
                )}
                <button type="button" className="btn bg-danger text-white hover:bg-red-600 rounded-lg px-3 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[36px]" onClick={() => setCancelConfirm(true)}>
                  <XCircle size={14} /> Cancel Subscription
                </button>
              </div>
            </div>
          </div>

          {/* Schedule change (pending change + plan a future change) */}
          <ScheduleConfig subscription={subscription} />
        </div>

        {/* RIGHT — delivery history */}
        <div className="sd-col flex flex-col gap-3">
          <div className="sd-card rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="sd-card-header sd-history-header flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 flex-wrap">
              <span className="sd-card-title inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Truck size={12} className="sd-card-title-icon text-slate-500" /> Delivery History
              </span>
              <div className="sd-history-controls flex items-center gap-2 flex-wrap">
                <div className="sd-month-nav inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button type="button" className="sd-month-btn flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => stepMonth(-1)} disabled={atEarliestMonth} aria-label="Previous month">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="sd-month-label text-xs font-bold text-slate-900 whitespace-nowrap px-1 flex items-center gap-2 min-w-[64px] justify-center">
                    {MONTH_NAMES[historyMonth.month].slice(0, 3)} {historyMonth.year}
                    {isCurrentMonth && <span className="sd-month-current-dot inline-block size-1.5 rounded-full bg-primary-600" title="Current month" />}
                  </span>
                  <button type="button" className="sd-month-btn flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => stepMonth(1)} disabled={isCurrentMonth} aria-label="Next month">
                    <ChevronRight size={14} />
                  </button>
                </div>

                {subscription.status !== 'cancelled' && (
                  <button type="button" className="btn bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-3 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[36px]" onClick={openAddHistory}>
                    <PlusCircle size={13} strokeWidth={2} style={{ marginRight: 2 }} /> Add Record
                  </button>
                )}
              </div>
            </div>

            {/* Monthly summary bar */}
            {selectedMonthDeliveries.length > 0 && (
              <div className="sd-month-summary flex items-stretch bg-slate-50 border-b border-slate-200">
                <div className="sd-month-summary-item flex flex-col justify-center gap-1 px-3 py-2 flex-1 min-w-0 border-r border-slate-200 last:border-0">
                  <span className="sd-month-summary-label text-[0.58rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">Records</span>
                  <span className="sd-month-summary-value text-sm font-extrabold text-slate-900 whitespace-nowrap truncate">{selectedMonthDeliveries.length}</span>
                </div>
                <div className="sd-month-summary-item flex flex-col justify-center gap-1 px-3 py-2 flex-1 min-w-0 border-r border-slate-200 last:border-0">
                  <span className="sd-month-summary-label text-[0.58rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">Qty delivered</span>
                  <span className="sd-month-summary-value text-sm font-extrabold text-slate-900 whitespace-nowrap truncate">{selectedMonthQty} {unit}</span>
                </div>
                <div className="sd-month-summary-item flex flex-col justify-center gap-1 px-3 py-2 flex-1 min-w-0 border-r border-slate-200 last:border-0">
                  <span className="sd-month-summary-label text-[0.58rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">Amount</span>
                  <span className="sd-month-summary-value sd-month-summary-value--money text-sm font-extrabold text-primary-600 whitespace-nowrap truncate">{formatCurrency(selectedMonthTotal)}</span>
                </div>
              </div>
            )}

            {selectedMonthDeliveries.length === 0 ? (
              <div className="sd-empty flex flex-col items-center gap-2 p-8 text-center text-slate-500">
                <Truck size={28} strokeWidth={1.25} className="text-slate-400" />
                <p className="text-sm">{`No deliveries in ${MONTH_NAMES[historyMonth.month]} ${historyMonth.year}`}</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="sd-table-wrap overflow-x-auto block lg:block hidden md:block">
                  <table className="sd-table w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Date</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Qty</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Rate</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Amount</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Note</th>
                        <th className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonthDeliveries.map((d: any, i: number) => {
                        const s = d.status || 'delivered';
                        return (
                          <tr key={d.id ?? i} className={`sd-tr border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors ${s === 'failed' ? 'bg-danger/5' : s === 'skipped' ? 'bg-warning/5' : ''}`}>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap sd-td-date">{formatDate(d.deliveryDate)}</td>
                            <td className="px-4 py-3"><StatusBadge status={s} className="size-auto" /></td>
                            <td className="px-4 py-3 text-xs tabular-nums text-slate-700 sd-td-num">{d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0} {unit}</td>
                            <td className="px-4 py-3 text-xs tabular-nums text-slate-700 sd-td-num">{d.pricePerUnit != null ? formatCurrency(d.pricePerUnit) : '—'}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-900 sd-td-amount">{formatCurrency(d.amount)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 sd-td-reason">{d.reason || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button type="button" className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-100" onClick={() => openEditHistory(d)} title="Edit">
                                  <Pencil size={12} />
                                </button>
                                <button type="button" className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50" onClick={() => openDeleteHistory(d)} title="Delete">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="sd-history-list flex flex-col p-2 px-4 pb-3 gap-0 lg:hidden">
                  {selectedMonthDeliveries.map((d: any, i: number) => renderHistoryRow(d, i))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit sheet ── */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="sm:max-w-[600px]">
          <SheetHeader className="p-4 sm:p-5">
            <SheetTitle className="text-base sm:text-lg">Edit Subscription</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0 sm:p-5">
            <SubscriptionForm
              defaultValues={{
                userId: typeof subscription.userId === 'string' ? subscription.userId : (subscription.userId as any)?.id ?? '',
                productId: typeof subscription.productId === 'string' ? subscription.productId : (subscription.productId as any)?.id ?? '',
                variantId: subscription.variantId ?? undefined,
                quantityPerDelivery: subscription.quantityPerDelivery ?? subscription.quantityPerDay ?? 1,
                customPrice: subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0,
                startDate: subscription.startDate?.slice(0, 10) ?? '',
                deliverySchedule: subscription.deliverySchedule,
                customDays: subscription.customDays ?? [],
                deliverySlot: ((subscription.deliverySlot ?? subscription.slot) === 'evening') ? 'evening' : 'morning',
                slotRows: subscription.slots,
              }}
              onSubmit={handleEdit}
              submitting={updateMutation.isPending}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ── History modal ── */}
      <Dialog open={historyModalOpen} onOpenChange={(open) => { setHistoryModalOpen(open); if (!open) setHistoryErrors({}); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Delivery Record' : 'Add Delivery Record'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6 space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); handleHistorySave(historyForm); }} className="flex flex-col gap-4">
              {isMultiSlot && (
                <FormField label="Slot" required error={historyErrors.slot}>
                  <Select value={historyForm.slot ?? ''} onChange={(e) => {
                    const slotValue = e.target.value || undefined;
                    setHistoryForm({ ...historyForm, slot: slotValue });
                    setHistoryErrors((prev) => ({ ...prev, slot: '' }));
                  }}>
                    <option value="">Select slot</option>
                    {slotConfig.map((sc) => (
                      <option key={sc.slot} value={sc.slot}>{sc.slot === 'morning' ? 'Morning' : 'Evening'}</option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField label="Delivery Date" required error={historyErrors.deliveryDate}>
                <Input type="date" max={now.toISOString().slice(0, 10)} value={historyForm.deliveryDate} onChange={(e) => {
                  setHistoryForm({ ...historyForm, deliveryDate: e.target.value });
                  setHistoryErrors((prev) => ({ ...prev, deliveryDate: '' }));
                }} />
              </FormField>
              <FormField label="Status" required>
                <Select value={historyForm.status} onChange={(e) => {
                  const next = e.target.value;
                  let qty = historyForm.actualQuantity;
                  const isSkipFail = next === 'skipped' || next === 'failed';
                  if (isSkipFail) qty = '';
                  else if ((historyForm.status === 'skipped' || historyForm.status === 'failed') && next === 'delivered') {
                    qty = scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot);
                  }
                  setHistoryForm({ ...historyForm, status: next, actualQuantity: qty, reason: isSkipFail ? historyForm.reason : '' });
                  setHistoryErrors((prev) => ({ ...prev, actualQuantity: '' }));
                }}>
                  <option value="delivered">Delivered</option>
                  <option value="partial">Partial</option>
                  <option value="extra">Extra</option>
                  <option value="skipped">Skipped</option>
                  <option value="failed">Failed</option>
                </Select>
              </FormField>
              {(historyForm.status !== 'skipped' && historyForm.status !== 'failed') && (
                <FormField label={`Quantity (${unit})`} required error={historyErrors.actualQuantity}>
                  <Input type="text" inputMode="decimal" value={historyForm.actualQuantity ?? ''} placeholder={`Scheduled: ${scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot)}`} onChange={(e) => {
                    const raw = e.target.value;
                    const qty = Number(raw);
                    const scheduledQty = scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot);
                    let newStatus = historyForm.status;
                    if (raw !== '' && Number.isFinite(qty)) {
                      if (qty === scheduledQty) newStatus = 'delivered';
                      else if (qty > 0 && qty < scheduledQty) newStatus = 'partial';
                      else if (qty > scheduledQty) newStatus = 'extra';
                    }
                    setHistoryForm({ ...historyForm, actualQuantity: raw, status: newStatus });
                    setHistoryErrors((prev) => ({ ...prev, actualQuantity: '' }));
                  }} />
                  <p className="mt-1 text-xs text-slate-500">Scheduled: {scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot)} {unit} · Status auto-adjusts based on quantity</p>
                </FormField>
              )}
              {(historyForm.status === 'skipped' || historyForm.status === 'failed') && (
                <FormField label="Reason" required error={historyErrors.reason}>
                  <Input value={historyForm.reason ?? ''} placeholder="Reason for skip / failure" onChange={(e) => {
                    setHistoryForm({ ...historyForm, reason: e.target.value });
                    setHistoryErrors((prev) => ({ ...prev, reason: '' }));
                  }} />
                </FormField>
              )}
              <FormField label="Notes">
                <Textarea value={historyForm.notes ?? ''} rows={2} placeholder="Optional notes" onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })} />
              </FormField>
              {/* Billing summary */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <span>Rate: <strong className="text-slate-900">{formatCurrency(effectivePrice)}/{unit}</strong></span>
                <span className="flex items-center gap-1">Amount:
                  {historyForm.actualQuantity !== '' && Number.isFinite(Number(historyForm.actualQuantity)) ? (
                    <strong className="text-slate-900">{formatCurrency(Number(historyForm.actualQuantity) * effectivePrice)}</strong>
                  ) : (
                    <strong className="text-slate-400 italic">Enter quantity to see amount</strong>
                  )}
                </span>
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" className="text-slate-500 hover:text-slate-700 text-sm font-medium" onClick={() => setHistoryModalOpen(false)}>Cancel</button>
                <button type="submit" className="ml-2 btn bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-bold transition-colors min-h-[36px]" disabled={recordOutcome.isPending}>
                  {recordOutcome.isPending ? 'Saving…' : editingEntry ? 'Update Record' : 'Add Record'}
                </button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ── Cancel confirm dialog ── */}
      <ConfirmDialog
        open={cancelConfirm}
        onOpenChange={setCancelConfirm}
        title="Cancel Subscription"
        description={`Cancel subscription for ${getName(subscription.userId, subscription.customerName ?? 'this customer')}? This cannot be undone.`}
        confirmLabel="Cancel Subscription"
        onConfirm={() => { handleStatus('cancelled'); setCancelConfirm(false); }}
        loading={statusMutation.isPending}
      />

      {/* ── Delete history confirm ── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => { if (!open) setDeleteEntryTarget(null); setDeleteConfirmOpen(false); }}
        title="Delete Delivery Record"
        description={
          deleteEntryTarget
            ? `Delete the ${formatDate(deleteEntryTarget.deliveryDate)} record (${deleteEntryTarget.status}, ${formatCurrency(deleteEntryTarget.amount)})?`
            : 'Delete this delivery record?'
        }
        confirmLabel="Delete Record"
        onConfirm={handleDeleteHistory}
        loading={deleteEntry.isPending}
        danger
      />

    </div>
  );
}
