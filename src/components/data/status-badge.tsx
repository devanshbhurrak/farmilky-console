import { Badge } from '@/components/ui/badge';
import { titleCase } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
  active: 'success',
  delivered: 'success',
  paid: 'success',
  resolved: 'success',
  completed: 'success',
  confirmed: 'success',
  read: 'success',
  approved: 'success',
  available: 'success',
  sent: 'info',
  in_progress: 'info',
  partially_paid: 'info',
  replied: 'info',
  morning: 'info',
  evening: 'info',
  paused: 'warning',
  pending: 'warning',
  placed: 'warning',
  draft: 'warning',
  open: 'warning',
  requested: 'warning',
  unread: 'warning',
  skipped: 'warning',
  inactive: 'warning',
  overdue: 'warning',
  cancelled: 'danger',
  failed: 'danger',
  closed: 'danger',
  rejected: 'danger',
  void: 'danger',
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const key = (status ?? 'unknown').toLowerCase();
  return (
    <Badge variant={STATUS_VARIANT[key] ?? 'secondary'} className={className}>
      {titleCase(status ?? 'unknown')}
    </Badge>
  );
}
