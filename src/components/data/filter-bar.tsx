import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export function FilterBar({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <Badge key={f.key} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
          <span className="font-normal text-slate-500">{f.label}:</span> {f.value}
          <button
            onClick={() => onRemove(f.key)}
            aria-label={`Remove ${f.label} filter`}
            className="flex size-5 items-center justify-center rounded-full hover:bg-slate-300"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="link" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
