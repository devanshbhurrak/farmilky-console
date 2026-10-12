import { MapPin, Phone } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { getId, getName } from '@/lib/utils';
import type { Agent } from '@/types/agent';

export function agentAreaName(agent: Agent): string | null {
  const raw = agent.agentInfo?.assignedArea;
  if (typeof raw === 'string') return (raw || agent.assignedAreaName) ?? null;
  if (raw && typeof raw === 'object') return raw.name ?? null;
  return agent.assignedAreaName ?? null;
}

export function AgentCard({ agent, onClick }: { agent: Agent; onClick?: (agent: Agent) => void }) {
  const area = agentAreaName(agent) || getName(agent.agentInfo?.assignedArea);
  return (
    <Card
      className="cursor-pointer p-4"
      onClick={() => onClick?.(agent)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(agent); } : undefined}
    >
      <div className="flex items-start gap-3">
        <Avatar name={agent.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{agent.name}</p>
            <StatusBadge status={agent.isActive ? 'active' : 'inactive'} />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Phone className="size-3" aria-hidden />
            {agent.phone ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {area && area !== '—' ? (
              <Badge variant="secondary">
                <MapPin className="size-3" aria-hidden /> {area}
              </Badge>
            ) : (
              <Badge variant="outline">Unassigned</Badge>
            )}
          </div>
        </div>
      </div>
      <span className="sr-only">{getId(agent)}</span>
    </Card>
  );
}
