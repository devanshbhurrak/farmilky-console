import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, getName } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';
import { Calendar, ChevronRight, Clock, Phone } from 'lucide-react';

const SCHEDULE_LABEL: Record<string, string> = {
  daily: 'Daily',
  alternate: 'Alt. Days',
  weekly: 'Weekly',
  custom: 'Custom',
};

const SCHEDULE_BADGE_STYLE: Record<string, string> = {
  daily: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  alternate: 'bg-blue-50 text-blue-700 border-blue-200/60',
  weekly: 'bg-purple-50 text-purple-700 border-purple-200/60',
  custom: 'bg-amber-50 text-amber-700 border-amber-200/60',
};

/**
 * Mobile-first modern card for subscription list items.
 * Clean, compact, highly legible with clear touch targets.
 */
export function SubscriptionCard({
  subscription,
  onClick,
}: {
  subscription: Subscription;
  onClick?: () => void;
}) {
  const customer = getName(subscription.userId, subscription.customerName ?? '—');
  const product = getName(subscription.productId, subscription.productName ?? '—');
  const unit = typeof subscription.productId === 'object' ? subscription.productId.unit : undefined;
  const qty = subscription.quantityPerDelivery ?? subscription.quantityPerDay ?? 0;
  const rate = subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0;
  const daily =
    subscription.totalPricePerDelivery ??
    subscription.totalPricePerDay ??
    qty * rate;
  const pendingAmount = subscription.pendingAmount ?? 0;
  const scheduleLabel = SCHEDULE_LABEL[subscription.deliverySchedule] ?? subscription.deliverySchedule;
  const scheduleBadgeCls =
    SCHEDULE_BADGE_STYLE[subscription.deliverySchedule] ?? 'bg-slate-50 text-slate-700 border-slate-200';

  const slotsList = Array.isArray(subscription.slots) && subscription.slots.length > 0
    ? subscription.slots.map((s) => `${s.quantityPerDelivery ?? qty} ${s.deliverySlot === 'evening' ? 'PM' : 'AM'}`).join(' + ')
    : null;

  return (
    <div
      className="group relative flex flex-col gap-2.5 transition-colors cursor-pointer select-none"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Top Header Row: Customer Name + Status & Schedule Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 truncate tracking-tight">{customer}</span>
            {subscription.customerPhone && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 font-normal">
                <Phone className="size-2.5 shrink-0" />
                {subscription.customerPhone}
              </span>
            )}
          </div>
          {/* Product details */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-slate-600">
            <span className="font-medium text-slate-800">{product}</span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-primary-700">
              {slotsList ? slotsList : `${qty} ${unit ?? 'unit'}`}
            </span>
            {rate > 0 && (
              <span className="text-slate-400 text-[11px]">
                (@ {formatCurrency(rate)}/{unit ?? 'unit'})
              </span>
            )}
          </div>
        </div>

        {/* Status + Chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={subscription.status} />
          <ChevronRight className="size-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Middle row: Schedule Chip + Slot badge + Start Date */}
      <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${scheduleBadgeCls}`}
          >
            <Clock className="size-2.5" />
            {scheduleLabel}
          </span>
          {subscription.deliverySchedule === 'custom' && subscription.customDays && subscription.customDays.length > 0 && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
              {subscription.customDays.map((d) => d.slice(0, 3)).join(', ')}
            </span>
          )}
          {!slotsList && (subscription.deliverySlot ?? subscription.slot) && (
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              {(subscription.deliverySlot ?? subscription.slot) === 'evening' ? 'PM' : 'AM'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
          <Calendar className="size-3" />
          <span>Since {formatDate(subscription.startDate)}</span>
        </div>
      </div>

      {/* Bottom KPI bar: Daily value & Pending balance */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Daily:</span>
          <span className="font-bold text-slate-900 text-sm">{formatCurrency(daily)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending:</span>
          <span
            className={`font-bold text-sm ${
              pendingAmount > 0 ? 'text-red-600' : 'text-slate-700'
            }`}
          >
            {formatCurrency(pendingAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
