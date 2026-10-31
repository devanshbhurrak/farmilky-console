import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/data/search-input';
import { todayLocal } from '@/lib/utils';

export interface DeliveryFiltersValue {
  date: string;
  slot: string;
  status: string;
  search: string;
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
  areas?: AreaOption[];
}) {
  const { date, slot, status, search } = filters;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <SearchInput
          value={search}
          onChange={(v) => onChange({ ...filters, search: v })}
          placeholder="Customer, phone, address…"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...filters, slot: slot === 'all' ? 'morning' : slot === 'morning' ? 'evening' : 'all' })}
          className="h-9 px-2 text-xs"
        >
          {slot === 'all' ? 'All sessions' : slot === 'morning' ? 'Morning' : 'Evening'}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          variant={status === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ ...filters, status: '' })}
          className="h-7 px-2 text-[10px] whitespace-nowrap"
        >
          All status
        </Button>
        {['pending', 'delivered', 'partial', 'failed', 'skipped'].map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ ...filters, status: s })}
            className="h-7 px-2 text-[10px] whitespace-nowrap"
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}
