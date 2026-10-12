import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { formatCurrency, getId, titleCase } from '@/lib/utils';
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
    price: p.price,
    stock: p.stock ?? undefined,
    fatContent: p.fatContent ?? '',
    image: p.image ?? '',
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
  return featured ? (featured.discountedPrice ?? featured.price) : p.price;
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
          {p.image ? (
            <img
              src={p.image}
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
            <Button onClick={openCreate}>
              <Plus />
              Add product
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={rawSearch}
          onChange={(v) => updateUrl({ search: v, page: null })}
          placeholder="Search products…"
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
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
