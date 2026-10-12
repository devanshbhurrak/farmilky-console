import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation, Phone, Play } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { API_BASE } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, getId } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-provider';
import { useAgentToday } from './hooks';

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useAgentToday();

  React.useEffect(() => {
    let source: EventSource | null = null;
    try {
      source = new EventSource(`${API_BASE}/api/sse`, { withCredentials: true });
      source.addEventListener('manifest:entry_updated', () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.manifests.today() });
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.dashboard() });
      });
    } catch {
      source = null;
    }
    return () => {
      try {
        source?.close();
      } catch {
        /* noop */
      }
    };
  }, [queryClient]);

  const entries = data?.entries ?? [];
  const delivered = entries.filter((e) => e.status === 'delivered').length;
  const failed = entries.filter((e) => e.status === 'failed' || e.status === 'skipped').length;
  const total = entries.length;
  const pending = Math.max(total - delivered - failed, 0);
  const summary = { total, delivered, failed, pending };
  const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const stats = [
    { label: 'Total stops', value: summary.total },
    { label: 'Delivered', value: summary.delivered },
    { label: 'Failed', value: summary.failed },
    { label: 'Pending', value: summary.pending },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Hello, ${user?.name ?? 'Agent'}`}
        description="Today's delivery route at a glance"
        actions={
          data?.manifestId ? (
            <Button onClick={() => navigate(`/agent/manifest/${data.manifestId}`)} className="min-h-11">
              <Play aria-hidden /> Start Deliveries
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-xs font-medium tracking-wide text-slate-500 uppercase">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '…' : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Route progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-2 p-4 text-sm text-red-600">
            <span>{getErrorMessage(error)}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <Card key={getId(entry) || `${entry.sequence}-${entry.customerName}`} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  #{entry.sequence} · {entry.customerName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {entry.productLabel ?? entry.productName ?? ''}
                  {entry.quantity ? ` × ${entry.quantity}` : ''}
                </p>
                {entry.address ? <p className="mt-0.5 text-xs text-slate-500">{entry.address}</p> : null}
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.phone ? (
                <a href={`tel:${entry.phone}`} className="min-h-11">
                  <Button size="sm" variant="outline" className="min-h-11">
                    <Phone aria-hidden /> Call
                  </Button>
                </a>
              ) : null}
              {entry.lat !== undefined && entry.lat !== null && entry.lng !== undefined && entry.lng !== null ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11"
                >
                  <Button size="sm" variant="outline" className="min-h-11">
                    <Navigation aria-hidden /> Navigate
                  </Button>
                </a>
              ) : null}
              {entry.phone ? <Badge variant="secondary">{entry.phone}</Badge> : null}
            </div>
          </Card>
        ))}
        {!isLoading && entries.length === 0 && !error && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-500">
              No deliveries assigned for today.{' '}
              {data?.manifestId ? <Link to={`/agent/manifest/${data.manifestId}`} className="underline">View manifest</Link> : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
