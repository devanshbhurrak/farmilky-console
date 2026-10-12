import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/data/search-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from '@/components/form/form-field';

export interface DeliveryFiltersValue {
  date: string;
  slot: string;
  type: string;
  status: string;
  area: string;
  search: string;
  sort: string;
}

export interface AreaOption {
  id: string;
  name: string;
}

export function DeliveryFilters({
  filters,
  onChange,
  areas,
}: {
  filters: DeliveryFiltersValue;
  onChange: (next: DeliveryFiltersValue) => void;
  areas: AreaOption[];
}) {
  const set = (patch: Partial<DeliveryFiltersValue>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <FormField label="Date">
          <Input type="date" value={filters.date} onChange={(e) => set({ date: e.target.value })} />
        </FormField>
        <FormField label="Slot">
          <Select value={filters.slot} onChange={(e) => set({ slot: e.target.value })}>
            <option value="all">All slots</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="partial">Partial</option>
            <option value="extra">Extra</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </Select>
        </FormField>
        <FormField label="Area">
          <Select value={filters.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sort">
          <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="sequence">Sequence</option>
            <option value="name">Name</option>
          </Select>
        </FormField>
        <div className="col-span-2 sm:col-span-1">
          <FormField label="Search">
            <SearchInput value={filters.search} onChange={(v) => set({ search: v })} placeholder="Customer…" />
          </FormField>
        </div>
      </div>
      <Tabs value={filters.type} onValueChange={(v) => set({ type: v })}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
          <TabsTrigger value="order">Orders</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
