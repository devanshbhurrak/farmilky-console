import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, getName, getPhone, titleCase } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';

export function SubscriptionCard({
  subscription,
  selected,
  onSelect,
  onClick,
}: {
  subscription: Subscription;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onClick?: () => void;
}) {
  const customer = getName(subscription.userId, subscription.customerName ?? '—');
  const phone = getPhone(subscription.userId);
  const product = getName(subscription.productId, subscription.productName ?? '—');
  const daily = subscription.totalPricePerDay ?? subscription.quantityPerDay * subscription.pricePerUnit;
  const standardRate =
    typeof subscription.productId === 'object' && subscription.productId !== null
      ? (subscription.productId.price ?? subscription.pricePerUnit)
      : subscription.pricePerUnit;
  const isCustom = Number(subscription.pricePerUnit) !== Number(standardRate);

  return (
    <Card
      className={selected ? 'border-primary-500 ring-1 ring-primary-500' : undefined}
    >
      <CardContent className="flex items-start gap-3 p-4">
        {onSelect && (
          <Checkbox
            checked={selected ?? false}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select subscription for ${customer}`}
            className="mt-1"
          />
        )}
        <button type="button" onClick={onClick} className="flex flex-1 flex-col gap-1.5 text-left">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{customer}</span>
            <StatusBadge status={subscription.status} />
          </span>
          {phone && <span className="text-xs text-slate-500">{phone}</span>}
          <span className="text-sm text-slate-700">
            {product} · {subscription.quantityPerDay}/day · {titleCase(subscription.deliverySchedule)}
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">{formatCurrency(daily)}</span>
            {isCustom && <Badge variant="warning">CUSTOM</Badge>}
            <span className="text-xs text-slate-500">
              {titleCase(typeof subscription.slot === 'string' ? subscription.slot : 'morning')} slot
            </span>
          </span>
        </button>
      </CardContent>
    </Card>
  );
}
