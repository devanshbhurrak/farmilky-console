import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/data/search-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from '@/components/form/form-field';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { todayLocal } from '@/lib/utils';

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
  const { date, slot, status, area, sort, type, search } = filters;
  const drawer = useFilterDrawer({ date, slot, status, area, sort });

  const activeCount = [
    slot !== 'morning',
    type !== 'all',
    Boolean(status),
    Boolean(area),
    sort !== 'sequence',
  ].filter(Boolean).length;

  const apply = () => {
    onChange({
      ...filters,
      date: drawer.draft.date,
      slot: drawer.draft.slot,
      status: drawer.draft.status,
      area: drawer.draft.area,
      sort: drawer.draft.sort,
    });
    drawer.setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={type} onValueChange={(v) => onChange({ ...filters, type: v })}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
          <TabsTrigger value="order">Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <SearchInput
          value={search}
          onChange={(v) => onChange({ ...filters, search: v })}
          placeholder="Customer…"
          className="flex-1"
        />
        <FilterButton activeCount={activeCount} onClick={drawer.openDrawer} />
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-5">
        <FormField label="Date">
          <Input type="date" value={date} onChange={(e) => onChange({ ...filters, date: e.target.value })} />
        </FormField>
        <FormField label="Slot">
          <Select value={slot} onChange={(e) => onChange({ ...filters, slot: e.target.value })}>
            <option value="all">All slots</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={status} onChange={(e) => onChange({ ...filters, status: e.target.value })}>
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
          <Select value={area} onChange={(e) => onChange({ ...filters, area: e.target.value })}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sort">
          <Select value={sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
            <option value="sequence">Sequence</option>
            <option value="name">Name</option>
          </Select>
        </FormField>
      </div>

      <FilterDrawer
        open={drawer.open}
        onOpenChange={drawer.setOpen}
        activeCount={activeCount}
        onApply={apply}
        onReset={() =>
          drawer.setDraft({
            date: todayLocal(),
            slot: 'morning',
            status: '',
            area: '',
            sort: 'sequence',
          })
        }
      >
        <FormField label="Date">
          <Input type="date" value={drawer.draft.date} onChange={(e) => drawer.setField('date', e.target.value)} />
        </FormField>
        <FormField label="Slot">
          <Select value={drawer.draft.slot} onChange={(e) => drawer.setField('slot', e.target.value)}>
            <option value="all">All slots</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={drawer.draft.status} onChange={(e) => drawer.setField('status', e.target.value)}>
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
          <Select value={drawer.draft.area} onChange={(e) => drawer.setField('area', e.target.value)}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sort">
          <Select value={drawer.draft.sort} onChange={(e) => drawer.setField('sort', e.target.value)}>
            <option value="sequence">Sequence</option>
            <option value="name">Name</option>
          </Select>
        </FormField>
      </FilterDrawer>
    </div>
  );
}
