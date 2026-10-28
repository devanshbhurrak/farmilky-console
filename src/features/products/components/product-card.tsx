import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, getImageUrl, titleCase } from '@/lib/utils';
import type { Product } from '@/types/product';
import { Trash2 } from 'lucide-react';

export function ProductCard({
  product,
  onClick,
  onDelete,
}: {
  product: Product;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const variants = product.variants ?? [];
  const featured = variants.find((v) => v.isDefault) ?? variants[0];
  const price = featured
    ? (featured.discountedPrice ?? featured.price)
    : (product.basePrice ?? product.price ?? 0);
  const image = product.imageUrl ?? product.image;

  return (
    <Card
      className={onClick ? 'cursor-pointer' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <CardContent className="flex gap-3 p-4">
        {image ? (
          <img
            src={getImageUrl(image)}
            alt={product.name}
            loading="lazy"
            className="size-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg font-semibold text-primary-800"
          >
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
            <StatusBadge status={product.isAvailable ? 'available' : 'inactive'} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{titleCase(product.category)}</Badge>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(price)}
              <span className="font-normal text-slate-500">/{product.unit}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {variants.length} variant{variants.length === 1 ? '' : 's'}
          </p>
        </div>
        {onDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Delete ${product.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
