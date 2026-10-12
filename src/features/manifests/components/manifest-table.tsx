import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatDate, titleCase } from '@/lib/utils';
import type { Manifest } from '@/types/manifest';

function agentLabel(manifest: Manifest): string {
  if (typeof manifest.agentId === 'object' && manifest.agentId !== null) {
    return manifest.agentId.name;
  }
  return manifest.agentName ?? String(manifest.agentId ?? '—');
}

function areaLabel(manifest: Manifest): string {
  if (manifest.areaName) return manifest.areaName;
  if (manifest.areaId && typeof manifest.areaId === 'object') return manifest.areaId.name;
  return '—';
}

export function ManifestCard({ manifest, onClick }: { manifest: Manifest; onClick?: () => void }) {
  const summary = manifest.summary ?? { total: 0, delivered: 0, failed: 0, pending: 0 };
  const total = summary.total || manifest.entries?.length || 0;
  const pct = total > 0 ? Math.round(((summary.delivered ?? 0) / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <button type="button" onClick={onClick} className="flex w-full flex-col gap-2 text-left">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{agentLabel(manifest)}</span>
            <StatusBadge status={manifest.status} />
          </span>
          <span className="text-xs text-slate-500">
            {areaLabel(manifest)} · {formatDate(manifest.date)} · {titleCase(manifest.slot ?? '')}
          </span>
          <span className="flex flex-col gap-1">
            <span className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs text-slate-600">
              {summary.delivered ?? 0}/{total} delivered · {summary.failed ?? 0} failed · {summary.pending ?? 0} pending
            </span>
          </span>
        </button>
      </CardContent>
    </Card>
  );
}

export function manifestAgentName(manifest: Manifest): string {
  return agentLabel(manifest);
}

export function manifestAreaName(manifest: Manifest): string {
  return areaLabel(manifest);
}
