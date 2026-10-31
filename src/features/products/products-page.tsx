import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ListView } from '@/components/data/list-view';
import type { Column } from '@/components/data/data-table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, getId, getImageUrl, titleCase } from '@/lib/utils';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/types/product';
import type { Product, ProductListParams } from '@/types/product';
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from './hooks';
import type { ProductInput } from './schemas';
import { ProductCard } from './components/product-card';
import { ProductForm } from './components/product-form';

const PAGE_SIZE = 20;

function toProductInput(product: Product): ProductInput {
  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(product.category)
    ? (product.category as ProductInput['category'])
    : 'other';
  const unit = (PRODUCT_UNITS as readonly string[]).includes(product.unit)
    ? (product.unit as ProductInput['unit'])
    : 'L';
  return {
    name: product.name,
    description: product.description ?? '',
    category,
    unit,
    basePrice: Number(product.basePrice ?? product.price ?? 0),
    stock: product.stock ?? undefined,
    fatContent:
      product.fatContent == null || product.fatContent === ''
        ? undefined
        : Number(product.fatContent),
    imageUrl: product.imageUrl ?? product.image ?? '',
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id || variant._id || undefined,
      label: variant.label,
      quantity: Number(variant.quantity ?? 1),
      unit: (PRODUCT_UNITS as readonly string[]).includes(variant.unit ?? '')
        ? (variant.unit as ProductInput['unit'])
        : unit,
      price: variant.price,
      discountedPrice: variant.discountedPrice ?? undefined,
      stock: variant.stock ?? 100,
      isDefault: variant.isDefault ?? false,
      isAvailable: variant.isAvailable ?? true,
    })),
    isAvailable: product.isAvailable,
  };
}

function effectivePrice(product: Product): number {
  const variants = product.variants ?? [];
  const featured = variants.find((variant) => variant.isDefault) ?? variants[0];
  return featured
    ? (featured.discountedPrice ?? featured.price)
    : Number(product.basePrice ?? product.price ?? 0);
}

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const availability = searchParams.get('availability') ?? 'all';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const filterConfig = {
    fields: {
      category: {
        label: 'Category',
        type: 'select' as const,
        options: [
          { value: 'all', label: 'All categories' },
          ...PRODUCT_CATEGORIES.map((value) => ({ value, label: titleCase(value) })),
        ],
      },
      availability: {
        label: 'Availability',
        type: 'select' as const,
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'available', label: 'Available' },
          { value: 'unavailable', label: 'Unavailable' },
        ],
      },
    },
    initialValues: { category: 'all', availability: 'all' },
  };

  const updateUrl = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const query = useProducts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: category !== 'all' ? category : undefined,
    availability: availability !== 'all' ? availability : undefined,
  } as ProductListParams);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const openEdit = React.useCallback((product: Product) => {
    setEditing(product);
    setSheetOpen(true);
  }, []);

  const handleFormSubmit = (values: ProductInput) => {
    if (editing) {
      updateMutation.mutate(
        { id: getId(editing), data: values },
        { onSuccess: () => setSheetOpen(false) },
      );
    } else {
      createMutation.mutate(values, { onSuccess: () => setSheetOpen(false) });
    }
  };

  const createAction = React.useMemo(
    () =>
      isAdmin ? (
        <Button onClick={openCreate} className="px-3 py-1.5 text-sm">
          <Plus aria-hidden /> Product
        </Button>
      ) : null,
    [isAdmin, openCreate],
  );

  const items = query.data?.items ?? [];
  const meta = query.data?.meta ?? { total: 0, page, limit: PAGE_SIZE, totalPages: 0 };
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (category !== 'all') {
    activeFilters.push({ key: 'category', label: 'Category', value: titleCase(category) });
  }
  if (availability !== 'all') {
    activeFilters.push({
      key: 'availability',
      label: 'Availability',
      value: availability === 'available' ? 'Available' : 'Unavailable',
    });
  }

  const columns: Column<Product>[] = [
    {
      header: 'Product',
      cell: (product) => (
        <div className="flex items-center gap-3">
          {(product.imageUrl ?? product.image) && (
            <img
              src={getImageUrl(product.imageUrl ?? product.image)}
              alt={product.name}
              loading="lazy"
              className="size-10 rounded-lg bg-slate-100 object-cover"
            />
          )}
          <div>
            <p className="max-w-[200px] truncate font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {titleCase(product.category)} ·{' '}
              {effectivePrice(product) > 0 ? formatCurrency(effectivePrice(product)) : '—'}
            </p>
          </div>
        </div>
      ),
    },
    { header: 'Unit', accessor: 'unit', hideOnMobile: true },
    {
      header: 'Stock',
      cell: (product) => (product.stock !== undefined ? String(product.stock) : '—'),
      hideOnMobile: true,
    },
    {
      header: 'Availability',
      cell: (product) => (
        <span className={product.isAvailable ? 'text-emerald-600' : 'text-slate-500'}>
          {product.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  if (isAdmin) {
    columns.push({
      header: 'Actions',
      cell: (product) => (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Edit ${product.name}`}
            onClick={() => openEdit(product)}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Delete ${product.name}`}
            onClick={() => setDeleting(product)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ),
    });
  }

  return (
    <ListView<Product>
      title="Products"
      createAction={createAction}
      searchPlaceholder="Search products..."
      searchValue={rawSearch}
      onSearchChange={(value) => updateUrl({ search: value, page: '1' })}
      filterConfig={filterConfig}
      columns={columns}
      data={items}
      keyExtractor={(product, index) => getId(product) || `product-${index}`}
      loading={query.isLoading}
      error={query.isError ? 'Failed to load products' : null}
      onRetry={() => query.refetch()}
      emptyTitle="No products found"
      emptyMessage="Try adjusting your search or filters."
      emptyIcon={<Package className="size-6" />}
      emptyActionLabel={isAdmin ? 'Add product' : undefined}
      onEmptyAction={isAdmin ? openCreate : undefined}
      renderCard={(product) => (
        <ProductCard
          product={product}
          onClick={isAdmin ? () => openEdit(product) : undefined}
          onDelete={isAdmin ? () => setDeleting(product) : undefined}
        />
      )}
      page={meta.page}
      totalPages={meta.totalPages}
      total={meta.total}
      onPageChange={(nextPage) => updateUrl({ page: String(nextPage) })}
    >
      {isAdmin && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{editing ? 'Edit product' : 'Add product'}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <ProductForm
                key={editing ? getId(editing) : 'new'}
                defaultValues={editing ? toProductInput(editing) : undefined}
                onSubmit={handleFormSubmit}
                submitting={saving}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete product?"
        description={deleting ? `${deleting.name} will be permanently removed.` : undefined}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(getId(deleting), {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </ListView>
  );
}
