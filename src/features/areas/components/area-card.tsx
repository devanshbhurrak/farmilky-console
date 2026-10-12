import { Link } from 'react-router-dom';
import { Pencil, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { getId, getName } from '@/lib/utils';
import type { Area } from '@/types/area';

interface AreaCardProps {
  area: Area;
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function preview(values: string[] | undefined, max = 3): string {
  const list = values ?? [];
  if (list.length === 0) return '—';
  const shown = list.slice(0, max).join(', ');
  return list.length > max ? `${shown} +${list.length - max} more` : shown;
}

export function AreaCard({ area, onManage, onEdit, onDelete }: AreaCardProps) {
  const agentName =
    typeof area.assignedAgent === 'string'
      ? (area.assignedAgentName ?? null)
      : getName(area.assignedAgent, area.assignedAgentName ?? 'Unassigned');

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
              #{area.sequence ?? 0}
            </span>
            <p className="truncate text-sm font-medium text-slate-900">{area.name}</p>
          </div>
          <StatusBadge status={area.isActive === false ? 'inactive' : 'active'} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <p className="truncate">PIN: {preview(area.pincodes)}</p>
          <p className="truncate">Localities: {preview(area.localities)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{agentName ?? 'Unassigned'}</Badge>
          <span className="text-xs text-slate-500">
            {area.customerCount ?? 0} customer{(area.customerCount ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Link
            to={`/areas/${getId(area)}/customers`}
            onClick={onManage}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Users className="size-4" />
            Customers
          </Link>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${area.name}`}>
            <Pencil />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete ${area.name}`}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
