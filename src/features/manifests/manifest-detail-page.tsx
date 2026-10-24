import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/data/status-badge';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { formatDate, getErrorMessage, getId, titleCase } from '@/lib/utils';
import { useManifest } from './hooks';
import { ManifestEntryCard } from './components/manifest-entry-card';
import { ResequenceDialog } from './components/resequence-dialog';
import { manifestAgentName, manifestAreaName } from './components/manifest-table';

export default function ManifestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [resequenceOpen, setResequenceOpen] = useState(false);

  const detailQuery = useManifest(id);
  const manifest = detailQuery.data;

  const { pending, completed } = useMemo(() => {
    const entries = manifest?.entries ?? [];
    return {
      pending: entries.filter((e) => (e.status ?? '').toLowerCase() === 'pending'),
      completed: entries.filter((e) => (e.status ?? '').toLowerCase() !== 'pending'),
    };
  }, [manifest]);

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !manifest) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          message={getErrorMessage(detailQuery.error, 'Manifest not found')}
          onRetry={() => detailQuery.refetch()}
        />
      </div>
    );
  }

  const summary = manifest.summary;
  const total = summary?.total ?? manifest.entries?.length ?? 0;
  const pct = total > 0 ? Math.round(((summary?.delivered ?? 0) / total) * 100) : 0;
  const backPath = isAdmin ? '/manifests' : '/agent';
  const backLabel = isAdmin ? 'Back to manifests' : 'Back to dashboard';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${manifestAgentName(manifest)} · ${formatDate(manifest.date)}`}
        breadcrumbs={[
          { label: isAdmin ? 'Manifests' : 'Agent', path: backPath },
          { label: `${manifestAgentName(manifest)} · ${formatDate(manifest.date)}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={manifest.status} />
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setResequenceOpen(true)} className="min-h-11">
                <ArrowDownLeft /> Resequence
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-sm text-slate-600">
            {summary?.delivered ?? 0}/{total} delivered · {summary?.failed ?? 0} failed ·{' '}
            {summary?.pending ?? 0} pending
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-slate-500">No pending entries.</p>}
        {pending.map((entry) => (
          <ManifestEntryCard
            key={getId(entry) || entry.id}
            entry={entry}
            manifestId={getId(manifest) || manifest.id}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Completed ({completed.length})</h2>
        {completed.length === 0 && <p className="text-sm text-slate-500">Nothing completed yet.</p>}
        {completed.map((entry) => (
          <ManifestEntryCard
            key={getId(entry) || entry.id}
            entry={entry}
            manifestId={getId(manifest) || manifest.id}
          />
        ))}
      </div>

      <Link to={backPath} className="text-sm text-primary-700 hover:underline">
        ← {backLabel}
      </Link>

      <ResequenceDialog manifest={manifest} open={resequenceOpen} onOpenChange={setResequenceOpen} />
    </div>
  );
}
