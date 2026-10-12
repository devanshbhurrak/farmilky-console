import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function BulkActionsBar({
  count,
  onDeliverAll,
  onClear,
  loading,
}: {
  count: number;
  onDeliverAll: () => void;
  onClear: () => void;
  loading?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-t-xl border border-slate-200 bg-white p-3 shadow-lg">
      <Badge variant="info">{count} selected</Badge>
      <Button size="sm" onClick={onDeliverAll} loading={loading} className="min-h-11">
        Deliver selected
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} className="min-h-11">
        Clear
      </Button>
    </div>
  );
}
