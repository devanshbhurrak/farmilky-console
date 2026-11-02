import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Pause,
  Play,
  XCircle,
  Package,
  Clock,
  Truck,
  Phone,
  Mail,
  User,
  Pencil,
  Edit2,
  IndianRupee,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Repeat2,
  PlusCircle,
  Trash2,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/data/stat-card';
import { StatusBadge } from '@/components/data/status-badge';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, getName } from '@/lib/utils';
import {
  useSubscription,
  useUpdateSubscription,
  useUpdateSubscriptionStatus,
  useRecordSubscriptionOutcome,
  useDeleteHistoryEntry,
} from './hooks';
import { slotConfigOf } from './api';
import { outcomeSchema } from './schemas';
import type { SubscriptionInput } from './schemas';
import { SubscriptionForm } from './components/subscription-form';
import { ScheduleConfig } from './components/schedule-config';

const SCHEDULE_LABEL: Record<string, string> = {
  daily: 'Daily',
  alternate: 'Every Other Day',
  weekly: 'Weekly',
  custom: 'Custom Days',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const STATUS_META: Record<string, { color: string; bg: string; text: string; icon: React.ElementType }> = {
  active: { color: 'var(--success)', bg: 'var(--success-bg)', text: 'var(--success-text)', icon: CheckCircle2 },
  paused: { color: 'var(--warning)', bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: Clock },
  cancelled: { color: 'var(--danger)', bg: 'var(--danger-bg)', text: 'var(--danger-text)', icon: XCircle },
};

const CHARGEABLE_STATUSES = new Set(['delivered', 'partial', 'extra']);

const HISTORY_STATUS_COLOR: Record<string, { dot: string; text: string }> = {
  delivered: { dot: 'var(--success)', text: 'var(--success-text)' },
  partial: { dot: 'var(--info)', text: 'var(--info-text)' },
  extra: { dot: 'var(--accent-500)', text: 'var(--accent-500)' },
  failed: { dot: 'var(--danger)', text: 'var(--danger-text)' },
  skipped: { dot: 'var(--warning)', text: 'var(--warning-text)' },
};

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [statusConfirmAction, setStatusConfirmAction] = useState<'active' | 'paused' | null>(null);
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
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (detailQuery.isError || !subscription) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <ErrorState
          message={getErrorMessage(detailQuery.error, 'Subscription not found')}
          onRetry={() => detailQuery.refetch()}
        />
      </div>
    );
  }

  const history = subscription.history ?? subscription.deliveries ?? [];
  const unit = typeof subscription.productId === 'object' ? subscription.productId.unit ?? 'unit' : 'unit';
  const effectivePrice =
    subscription.pricePerPacket ??
    (subscription.quantityPerDelivery > 0
      ? subscription.totalPricePerDelivery / subscription.quantityPerDelivery
      : 0);
  const listPrice = typeof subscription.productId === 'object' ? subscription.productId.price ?? null : null;
  const isCustomPrice =
    subscription.pricePerPacket != null && listPrice != null && subscription.pricePerPacket !== listPrice;
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
    .filter((d: any) => CHARGEABLE_STATUSES.has(d.status || 'delivered'))
    .reduce(
      (sum, d: any) =>
        sum +
        Number(
          d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0,
        ),
      0,
    );

  const subStartDate = subscription.startDate ? new Date(subscription.startDate) : null;
  let earliestMonth = subStartDate
    ? { month: subStartDate.getMonth(), year: subStartDate.getFullYear() }
    : { month: currentCalMonth, year: currentCalYear };
  if (history.length > 0) {
    for (const d of history) {
      const date = new Date(d.deliveryDate);
      if (isNaN(date.getTime())) continue;
      if (
        date.getFullYear() < earliestMonth.year ||
        (date.getFullYear() === earliestMonth.year && date.getMonth() < earliestMonth.month)
      ) {
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
    statusMutation.mutate(
      { id, status },
      {
        onSuccess: () => {
          setEditOpen(false);
          setStatusConfirmAction(null);
          detailQuery.refetch();
        },
      },
    );
  };

  const scheduledQtyOf = (slot?: string) =>
    (slot ? slotConfig.find((s) => s.slot === slot)?.quantityPerDelivery : undefined) ??
    subscription.quantityPerDelivery ??
    subscription.quantityPerDay ??
    0;

  const stepMonth = (direction: number) => {
    setHistoryMonth((prev) => {
      let m = prev.month + direction;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      if (m > 11) {
        m = 0;
        y += 1;
      }
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
    recordOutcome.mutate(
      { id, data: parsed.data },
      {
        onSuccess: () => {
          setHistoryModalOpen(false);
          detailQuery.refetch();
          const saved = new Date(parsed.data.deliveryDate);
          if (!isNaN(saved.getTime())) setHistoryMonth({ month: saved.getMonth(), year: saved.getFullYear() });
        },
      },
    );
  };

  const openAddHistory = () => {
    setHistoryErrors({});
    setEditingEntry(null);
    setHistoryForm({
      deliveryDate: now.toISOString().slice(0, 10),
      slot: isMultiSlot ? slotConfig[0]?.slot ?? 'morning' : undefined,
      status: 'delivered',
      actualQuantity: scheduledQtyOf(slotConfig[0]?.slot),
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
    deleteEntry.mutate(
      { id, entryId: deleteEntryTarget.id },
      {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setDeleteEntryTarget(null);
          detailQuery.refetch();
        },
      },
    );
  };

  const handleEdit = (values: SubscriptionInput) => {
    if (!id) return;
    updateMutation.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          setEditOpen(false);
          detailQuery.refetch();
        },
      },
    );
  };

  const renderHistoryCard = (d: any, i: number) => {
    const s = d.status || 'delivered';
    const actual =
      d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0;
    const colors = HISTORY_STATUS_COLOR[s] || HISTORY_STATUS_COLOR.delivered;
    return (
      <div
        key={d.id ?? i}
        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ background: colors.dot }}
            />
            <span className="text-xs font-bold text-slate-900">{formatDate(d.deliveryDate)}</span>
            {(d.deliverySlot ?? d.slot) && (
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {(d.deliverySlot ?? d.slot) === 'evening' ? 'PM' : 'AM'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900">{formatCurrency(d.amount)}</span>
            <button
              type="button"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => openEditHistory(d)}
              aria-label="Edit record"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50"
              onClick={() => openDeleteHistory(d)}
              aria-label="Delete record"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">
              {actual} {unit}
            </span>
            <StatusBadge status={s} />
          </div>
          {d.reason && (
            <span className="text-[11px] text-slate-500 italic truncate max-w-[140px]">{d.reason}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="view-stack sd-page flex flex-col gap-4 p-3 sm:p-4">
      {/* Top Header */}
      <PageHeader
        title={getName(subscription.productId, subscription.productName ?? 'Subscription')}
        breadcrumbs={[
          { label: 'Subscriptions', path: '/subscriptions' },
          { label: getName(subscription.productId, subscription.productName ?? 'Subscription') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="text-xs font-semibold min-h-[36px]"
            >
              <Edit2 className="size-3.5 mr-1" /> Edit Plan
            </Button>
            {subscription.status !== 'active' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setStatusConfirmAction('active')}
                className="text-xs font-semibold min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="size-3.5 mr-1" /> Activate
              </Button>
            )}
            {subscription.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusConfirmAction('paused')}
                className="text-xs font-semibold min-h-[36px] text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Pause className="size-3.5 mr-1" /> Pause
              </Button>
            )}
            {subscription.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelConfirm(true)}
                className="text-xs font-semibold min-h-[36px] text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="size-3.5 mr-1" /> Cancel
              </Button>
            )}
          </div>
        }
      />

      {/* Hero / Summary Card for Mobile & Desktop */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 border border-primary-200/60 text-primary-700">
              <Package className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {getName(subscription.productId, subscription.productName ?? 'Unknown Product')}
                </h1>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase whitespace-nowrap"
                  style={{ background: statusMeta.bg, color: statusMeta.color }}
                >
                  <StatusIcon className="size-3" />
                  <span>{subscription.status}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-semibold text-slate-700">
                  {getName(subscription.userId, subscription.customerName ?? 'Unknown')}
                </span>
                {subscription.customerPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-2.5" /> {subscription.customerPhone}
                  </span>
                )}
                <span>·</span>
                <span>Since {formatDate(subscription.startDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Daily Total</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}
              </span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Plan Qty</span>
              <span className="text-base font-extrabold text-slate-900">
                {subscription.quantityPerDelivery ?? subscription.quantityPerDay} {unit}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule chips */}
        <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100 text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-semibold text-slate-700">
            <Repeat2 className="size-3" /> {scheduleLabel}
          </span>
          {isMultiSlot ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 border border-primary-200/60 px-2.5 py-1 font-semibold text-primary-900">
              {slotConfig.map((s) => `${s.quantityPerDelivery} ${s.slot === 'morning' ? 'AM' : 'PM'}`).join(' + ')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-semibold text-slate-700">
              <Clock className="size-3" /> {(subscription.deliverySlot ?? subscription.slot) === 'evening' ? 'Evening Slot' : 'Morning Slot'}
            </span>
          )}
          {isCustomPrice && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-800">
              Custom Rate: {formatCurrency(effectivePrice)}/{unit}
            </span>
          )}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard
          icon={<IndianRupee className="size-4" />}
          label="Daily Value"
          value={formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}
        />
        <StatCard
          icon={<Truck className="size-4" />}
          label="Deliveries"
          value={totalDelivered}
          subtitle={`of ${history.length} recorded`}
        />
        <StatCard
          icon={<CalendarDays className="size-4" />}
          label="This Month"
          value={formatCurrency(currentMonthCharges)}
          subtitle={`${currentMonthDeliveries.length} deliveries`}
        />
        <StatCard
          icon={<AlertCircle className="size-4" />}
          label="Pending Due"
          value={formatCurrency(subscription.pendingAmount || 0)}
          valueClassName={(subscription.pendingAmount || 0) > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}
          subtitle={(subscription.pendingAmount || 0) > 0 ? 'Outstanding' : 'All clear'}
        />
      </div>

      {/* Financial dues breakdown */}
      {(currentMonthCharges > 0 || previousMonthCharges > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-slate-600 font-medium">{MONTH_NAMES[currentCalMonth]} {currentCalYear} Charges</span>
            <span className="font-bold text-slate-900">{formatCurrency(currentMonthCharges)}</span>
          </div>
          {previousMonthCharges > 0 && (
            <div className="flex items-center justify-between bg-amber-50/60 px-4 py-2.5 border-b border-amber-100">
              <span className="text-amber-800 font-semibold">Previous Outstanding Dues</span>
              <span className="font-bold text-red-600">{formatCurrency(previousMonthCharges)}</span>
            </div>
          )}
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
            <span className="font-bold uppercase tracking-wider text-slate-600">Total Pending Balance</span>
            <span className="font-extrabold text-sm text-slate-900">{formatCurrency(Math.max(0, subscription.pendingAmount || 0))}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Left side Plan & Customer details, Right side History */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Details & Plan */}
        <div className="flex flex-col gap-3">
          {/* Plan Details Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Package className="size-3.5 text-slate-500" /> Plan Details
              </span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500 font-medium">Product</span>
                <span className="font-semibold text-slate-900">{getName(subscription.productId, subscription.productName ?? '—')}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500 font-medium">Schedule</span>
                <span className="font-semibold text-slate-900">{scheduleLabel}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500 font-medium">Quantity / Delivery</span>
                <span className="font-semibold text-slate-900">{subscription.quantityPerDelivery ?? subscription.quantityPerDay} {unit}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500 font-medium">Rate / {unit}</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  {formatCurrency(effectivePrice)}
                  {isCustomPrice && <span className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded font-bold">Custom</span>}
                </span>
              </div>
              {isCustomPrice && listPrice != null && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-500 font-medium">Standard Price</span>
                  <span className="text-slate-400 line-through">{formatCurrency(listPrice)} / {unit}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50">
                <span className="text-slate-600 font-semibold">Daily Total</span>
                <span className="font-bold text-sm text-primary-800">{formatCurrency(subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500 font-medium">Start Date</span>
                <span className="font-semibold text-slate-900">{formatDate(subscription.startDate)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <User className="size-3.5 text-slate-500" /> Customer Information
              </span>
              <Link
                to={`/customers/${typeof subscription.userId === 'object' ? subscription.userId.id : subscription.userId}`}
                className="text-xs font-semibold text-primary-700 hover:underline"
              >
                View Profile
              </Link>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <p className="font-bold text-slate-900 text-sm">{getName(subscription.userId, subscription.customerName ?? 'Unknown')}</p>
              <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                {subscription.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-slate-400" />
                    <span>{subscription.customerPhone}</span>
                  </div>
                )}
                {subscription.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-slate-400" />
                    <span className="truncate">{subscription.customerEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Config Component */}
          <ScheduleConfig subscription={subscription} />
        </div>

        {/* Right Column: Delivery History */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Truck className="size-3.5 text-slate-500" /> Delivery History
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Month navigation */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => stepMonth(-1)}
                    disabled={atEarliestMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="text-xs font-bold text-slate-900 px-2 min-w-[70px] text-center flex items-center justify-center gap-1.5">
                    {MONTH_NAMES[historyMonth.month].slice(0, 3)} {historyMonth.year}
                    {isCurrentMonth && <span className="size-1.5 rounded-full bg-primary-600" title="Current month" />}
                  </span>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => stepMonth(1)}
                    disabled={isCurrentMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                {subscription.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs font-semibold"
                    onClick={openAddHistory}
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Add Record
                  </Button>
                )}
              </div>
            </div>

            {/* Monthly mini-stats */}
            {selectedMonthDeliveries.length > 0 && (
              <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/50 text-center divide-x divide-slate-100">
                <div className="p-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Deliveries</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{selectedMonthDeliveries.length}</span>
                </div>
                <div className="p-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivered Qty</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{selectedMonthQty} {unit}</span>
                </div>
                <div className="p-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
                  <span className="text-xs sm:text-sm font-bold text-primary-800">{formatCurrency(selectedMonthTotal)}</span>
                </div>
              </div>
            )}

            {/* History Records */}
            {selectedMonthDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
                <Calendar className="size-8 text-slate-300" />
                <p className="text-xs font-medium">
                  No delivery records for {MONTH_NAMES[historyMonth.month]} {historyMonth.year}.
                </p>
                {subscription.status !== 'cancelled' && (
                  <Button variant="outline" size="sm" onClick={openAddHistory} className="mt-1 text-xs">
                    <PlusCircle className="size-3 mr-1" /> Record Delivery Outcome
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5">Rate</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Note</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMonthDeliveries.map((d: any, i: number) => {
                        const s = d.status || 'delivered';
                        const actual =
                          d.actualQuantity ?? d.quantityDelivered ?? d.quantity ?? subscription.quantityPerDelivery ?? 0;
                        return (
                          <tr key={d.id ?? i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                              {formatDate(d.deliveryDate)}
                              {(d.deliverySlot ?? d.slot) && (
                                <span className="ml-1 text-[10px] text-slate-500 font-bold uppercase">
                                  {(d.deliverySlot ?? d.slot) === 'evening' ? 'PM' : 'AM'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={s} />
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {actual} {unit}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {d.pricePerUnit != null ? formatCurrency(d.pricePerUnit) : '—'}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(d.amount)}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{d.reason || d.notes || '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  onClick={() => openEditHistory(d)}
                                  title="Edit"
                                >
                                  <Pencil className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openDeleteHistory(d)}
                                  title="Delete"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="flex flex-col gap-2 p-3 md:hidden">
                  {selectedMonthDeliveries.map((d: any, i: number) => renderHistoryCard(d, i))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Subscription Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl">
          <SheetHeader className="p-4 sm:p-5">
            <SheetTitle className="text-base sm:text-lg">Edit Subscription</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            <SubscriptionForm
              defaultValues={{
                userId:
                  typeof subscription.userId === 'string'
                    ? subscription.userId
                    : (subscription.userId as any)?.id ?? '',
                productId:
                  typeof subscription.productId === 'string'
                    ? subscription.productId
                    : (subscription.productId as any)?.id ?? '',
                variantId: subscription.variantId ?? undefined,
                quantityPerDelivery: subscription.quantityPerDelivery ?? subscription.quantityPerDay ?? 1,
                customPrice: subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0,
                startDate: subscription.startDate?.slice(0, 10) ?? '',
                deliverySchedule: subscription.deliverySchedule,
                customDays: subscription.customDays ?? [],
                deliverySlot: (subscription.deliverySlot ?? subscription.slot) === 'evening' ? 'evening' : 'morning',
                slotRows: subscription.slots,
              }}
              onSubmit={handleEdit}
              submitting={updateMutation.isPending}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Record / Edit Outcome Dialog */}
      <Dialog
        open={historyModalOpen}
        onOpenChange={(open) => {
          setHistoryModalOpen(open);
          if (!open) setHistoryErrors({});
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Delivery Record' : 'Record Delivery Outcome'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleHistorySave(historyForm);
              }}
              className="flex flex-col gap-3.5 text-xs text-slate-800"
            >
              {isMultiSlot && (
                <FormField label="Slot" required error={historyErrors.slot}>
                  <Select
                    value={historyForm.slot ?? ''}
                    onChange={(e) => {
                      const slotValue = e.target.value || undefined;
                      setHistoryForm({ ...historyForm, slot: slotValue });
                      setHistoryErrors((prev) => ({ ...prev, slot: '' }));
                    }}
                  >
                    <option value="">Select slot</option>
                    {slotConfig.map((sc) => (
                      <option key={sc.slot} value={sc.slot}>
                        {sc.slot === 'morning' ? 'Morning Slot' : 'Evening Slot'}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Delivery Date" required error={historyErrors.deliveryDate}>
                <Input
                  type="date"
                  max={now.toISOString().slice(0, 10)}
                  value={historyForm.deliveryDate}
                  onChange={(e) => {
                    setHistoryForm({ ...historyForm, deliveryDate: e.target.value });
                    setHistoryErrors((prev) => ({ ...prev, deliveryDate: '' }));
                  }}
                />
              </FormField>

              <FormField label="Outcome Status" required>
                <Select
                  value={historyForm.status}
                  onChange={(e) => {
                    const next = e.target.value;
                    let qty = historyForm.actualQuantity;
                    const isSkipFail = next === 'skipped' || next === 'failed';
                    if (isSkipFail) qty = '';
                    else if (
                      (historyForm.status === 'skipped' || historyForm.status === 'failed') &&
                      next === 'delivered'
                    ) {
                      qty = scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot);
                    }
                    setHistoryForm({
                      ...historyForm,
                      status: next,
                      actualQuantity: qty,
                      reason: isSkipFail ? historyForm.reason : '',
                    });
                    setHistoryErrors((prev) => ({ ...prev, actualQuantity: '' }));
                  }}
                >
                  <option value="delivered">Delivered (Full)</option>
                  <option value="partial">Partial Delivery</option>
                  <option value="extra">Extra Delivered</option>
                  <option value="skipped">Customer Skipped</option>
                  <option value="failed">Delivery Failed</option>
                </Select>
              </FormField>

              {historyForm.status !== 'skipped' && historyForm.status !== 'failed' && (
                <FormField label={`Quantity (${unit})`} required error={historyErrors.actualQuantity}>
                  <Input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={historyForm.actualQuantity ?? ''}
                    placeholder={`Scheduled: ${scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot)}`}
                    onChange={(e) => {
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
                    }}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Scheduled: {scheduledQtyOf(historyForm.slot ?? slotConfig[0]?.slot)} {unit}
                  </p>
                </FormField>
              )}

              {(historyForm.status === 'skipped' || historyForm.status === 'failed') && (
                <FormField label="Reason" required error={historyErrors.reason}>
                  <Input
                    value={historyForm.reason ?? ''}
                    placeholder="Reason for skip / failure"
                    onChange={(e) => {
                      setHistoryForm({ ...historyForm, reason: e.target.value });
                      setHistoryErrors((prev) => ({ ...prev, reason: '' }));
                    }}
                  />
                </FormField>
              )}

              <FormField label="Notes (Optional)">
                <Textarea
                  value={historyForm.notes ?? ''}
                  rows={2}
                  placeholder="Additional notes"
                  onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                />
              </FormField>

              {/* Billing calculated amount */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span>
                  Rate: <strong className="text-slate-900">{formatCurrency(effectivePrice)}/{unit}</strong>
                </span>
                <span>
                  Amount:{' '}
                  {historyForm.actualQuantity !== '' && Number.isFinite(Number(historyForm.actualQuantity)) ? (
                    <strong className="text-emerald-700 font-bold">
                      {formatCurrency(Number(historyForm.actualQuantity) * effectivePrice)}
                    </strong>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </span>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHistoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default" loading={recordOutcome.isPending}>
                  {editingEntry ? 'Update Record' : 'Save Record'}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Activate / Pause Confirm Dialog */}
      <ConfirmDialog
        open={statusConfirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmAction(null);
        }}
        title={statusConfirmAction === 'active' ? 'Activate Subscription' : 'Pause Subscription'}
        description={
          statusConfirmAction === 'active'
            ? `Resume active deliveries for ${getName(subscription.userId, subscription.customerName ?? 'this customer')}?`
            : `Pause deliveries for ${getName(subscription.userId, subscription.customerName ?? 'this customer')}? Deliveries will stop until resumed.`
        }
        confirmLabel={statusConfirmAction === 'active' ? 'Activate' : 'Pause'}
        onConfirm={() => {
          if (statusConfirmAction) handleStatus(statusConfirmAction);
        }}
        loading={statusMutation.isPending}
        danger={statusConfirmAction === 'paused'}
      />

      {/* Cancel Subscription Dialog */}
      <ConfirmDialog
        open={cancelConfirm}
        onOpenChange={setCancelConfirm}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel the subscription for ${getName(subscription.userId, subscription.customerName ?? 'this customer')}? This will stop future deliveries.`}
        confirmLabel="Cancel Subscription"
        onConfirm={() => {
          handleStatus('cancelled');
          setCancelConfirm(false);
        }}
        loading={statusMutation.isPending}
        danger
      />

      {/* Delete History Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteEntryTarget(null);
          setDeleteConfirmOpen(false);
        }}
        title="Delete Delivery Record"
        description={
          deleteEntryTarget
            ? `Permanently delete delivery record for ${formatDate(deleteEntryTarget.deliveryDate)} (${deleteEntryTarget.status}, ${formatCurrency(deleteEntryTarget.amount)})?`
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
