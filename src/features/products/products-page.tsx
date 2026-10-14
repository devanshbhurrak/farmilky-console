import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/data/data-table';
import { FilterBar, type ActiveFilter } from '@/components/data/filter-bar';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { cn, formatCurrency, getId, titleCase } from '@/lib/utils';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS, type Product, type ProductListParams } from '@/types/product';
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from './hooks';
import type { ProductInput } from './schemas';
import { ProductCard } from './components/product-card';
import { ProductForm } from './components/product-form';

const PAGE_SIZE = 20;

function toProductInput(p: Product): ProductInput {
  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(p.category)
    ? (p.category as ProductInput['category'])
    : 'other';
  const unit = (PRODUCT_UNITS as readonly string[]).includes(p.unit)
    ? (p.unit as ProductInput['unit'])
    : 'L';
  return {
    name: p.name,
    description: p.description ?? '',
    category,
    unit,
    basePrice: Number(p.basePrice ?? p.price ?? 0),
    stock: p.stock ?? undefined,
    fatContent: p.fatContent ?? '',
    imageUrl: p.imageUrl ?? p.image ?? '',
    variants: (p.variants ?? []).map((v) => ({
      label: v.label,
      quantity: v.quantity,
      unit: v.unit ?? '',
      price: v.price,
      discountedPrice: v.discountedPrice ?? undefined,
      stock: v.stock ?? 100,
      isDefault: v.isDefault ?? false,
      isAvailable: v.isAvailable ?? true,
    })),
    isAvailable: p.isAvailable,
  };
}

function effectivePrice(p: Product): number {
  const variants = p.variants ?? [];
  const featured = variants.find((v) => v.isDefault) ?? variants[0];
  return featured ? (featured.discountedPrice ?? featured.price) : Number(p.basePrice ?? p.price ?? 0);
}

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const rawSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const availability = searchParams.get('availability') ?? 'all';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const params: ProductListParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    category: category !== 'all' ? category : undefined,
    availability: availability !== 'all' ? availability : undefined,
  };
  const { data, isLoading, isError, refetch } = useProducts(params);
  const items = data?.items ?? [];
  const meta = data?.meta ?? { total: 0, page, limit: PAGE_SIZE, totalPages: 0 };

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const updateUrl = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  };

  const activeFilters: ActiveFilter[] = [];
  if (category !== 'all')
    activeFilters.push({ key: 'category', label: 'Category', value: titleCase(category) });
  if (availability !== 'all')
    activeFilters.push({
      key: 'availability',
      label: 'Availability',
      value: availability === 'available' ? 'Available' : 'Unavailable',
    });

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setSheetOpen(true);
  };

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

  const columns: Column<Product>[] = [
    {
      header: 'Product',
      cell: (p) => (
        <div className="flex items-center gap-3">
          {(p.imageUrl ?? p.image) ? (
            <img
              src={p.imageUrl ?? p.image ?? ''}
              alt={p.name}
              loading="lazy"
              className="size-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-semibold text-primary-800"
            >
              {p.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-medium text-slate-900">{p.name}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (p) => <Badge variant="secondary">{titleCase(p.category)}</Badge>,
    },
    {
      header: 'Price',
      cell: (p) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(effectivePrice(p))}
          <span className="font-normal text-slate-500">/{p.unit}</span>
        </span>
      ),
    },
    {
      header: 'Variants',
      cell: (p) => <span>{p.variants?.length ?? 0}</span>,
    },
    {
      header: 'Status',
      cell: (p) => <StatusBadge status={p.isAvailable ? 'available' : 'inactive'} />,
    },
  ];
  if (isAdmin) {
    columns.push({
      header: 'Actions',
      cell: (p) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(p)}
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 className="text-red-600" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Products"
        description="Manage the product catalog and variants"
        actions={
          isAdmin ? (
            <Button onClick={openCreate} className="min-h-11">
              <Plus />
              Add product
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput
            value={rawSearch}
            onChange={(v) => updateUrl({ search: v, page: null })}
            placeholder="Search products…"
            className="flex-1"
          />
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors md:hidden',
              filtersOpen ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              (category !== 'all' || availability !== 'all') && 'border-primary-300',
            )}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {(category !== 'all' || availability !== 'all') ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white">
                {[category !== 'all', availability !== 'all'].filter(Boolean).length}
              </span>
            ) : null}
          </button>
        </div>
        <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', !filtersOpen && 'hidden md:grid')}>
          <Select
            value={category}
            onChange={(e) => updateUrl({ category: e.target.value === 'all' ? '' : e.target.value, page: null })}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </Select>
          <Select
            value={availability}
            onChange={(e) => updateUrl({ availability: e.target.value === 'all' ? '' : e.target.value, page: null })}
            aria-label="Filter by availability"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </Select>
        </div>
      </div>
      <FilterBar
        filters={activeFilters}
        onRemove={(key) => updateUrl({ [key]: '', page: null })}
        onClearAll={() => updateUrl({ category: '', availability: '', page: null })}
      />

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(p, i) => getId(p) || `product-${i}`}
        loading={isLoading}
        error={isError ? 'Failed to load products' : null}
        onRetry={() => refetch()}
        emptyTitle="No products found"
        emptyMessage="Try adjusting your search or filters."
        emptyIcon={<Package className="size-6" />}
        emptyActionLabel={isAdmin ? 'Add product' : undefined}
        onEmptyAction={isAdmin ? openCreate : undefined}
        renderCard={(p) => <ProductCard product={p} />}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={(next) => updateUrl({ page: String(next) })}
      />

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
                submitting={createMutation.isPending || updateMutation.isPending}
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
        description={deleting ? `"${deleting.name}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(getId(deleting), {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
