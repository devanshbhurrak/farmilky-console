import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, getName } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';

const SCHEDULE_LABEL: Record<string, string> = {
  daily: 'Daily', alternate: 'Alt. days', weekly: 'Weekly', custom: 'Custom',
};

/**
 * Card content rendered inside DataTable's Card wrapper on mobile, so this
 * must not itself be a Card (that would produce a nested double card).
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
  const daily = subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? qty * (subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0);
  const pendingAmount = subscription.pendingAmount ?? 0;
  const scheduleLabel = SCHEDULE_LABEL[subscription.deliverySchedule] ?? subscription.deliverySchedule;
  const status = subscription.status;

  return (
    <div
      className="cursor-pointer"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <div className="mc-head mc-head--status">
        <div className="mc-identity">
          <span className="mc-name">{customer}</span>
          <span className="mc-sub">
            {product} &middot; {qty}&nbsp;{unit ?? 'unit'}
            {subscription.customerPhone ? ` · ${subscription.customerPhone}` : ''}
          </span>
        </div>
        <div className="mc-tags">
          <StatusBadge status={status} />
          <span className={`mc-schedule-tag schedule-${subscription.deliverySchedule}`}>
            {scheduleLabel}
          </span>
        </div>
      </div>
      <div className="mc-stats mt-3">
        <div className="mc-stat">
          <span className="mc-stat-label">Daily Value</span>
          <span className="mc-stat-value">{formatCurrency(daily)}</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-label">Since</span>
          <span className="mc-stat-value">{formatDate(subscription.startDate)}</span>
        </div>
        <div className="mc-stat">
          <span className={`mc-stat-value ${pendingAmount > 0 ? 'danger' : 'muted'}`}>
            {formatCurrency(pendingAmount)}
          </span>
          <span className="mc-stat-label">Pending</span>
        </div>
      </div>
    </div>
  );
}
