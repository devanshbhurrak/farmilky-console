import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getName } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-provider';
import { useAgent } from './hooks';
import { agentAreaName } from './components/agent-table';

export default function AgentProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: agent } = useAgent(user?.id);

  const name = agent?.name ?? user?.name ?? 'Agent';
  const area = agent ? agentAreaName(agent) : null;

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My profile" description="Your account and delivery assignment" />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
          <Avatar name={name} className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
            <p className="text-sm text-slate-500">
              {agent?.phone ?? user?.phone ?? '—'}
              {(agent?.email ?? user?.email) ? ` · ${agent?.email ?? user?.email}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <Badge variant="secondary">{user?.role ?? 'agent'}</Badge>
              {area ? <Badge variant="default">{area}</Badge> : <Badge variant="outline">No area assigned</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery config</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-slate-500">Assigned area: </span>
            <span className="font-medium">{area ?? getName(agent?.agentInfo?.assignedArea, 'Unassigned')}</span>
          </p>
          <p>
            <span className="text-slate-500">Vehicle: </span>
            <span className="font-medium">{agent?.agentInfo?.vehicleType || '—'}</span>
          </p>
          <p>
            <span className="text-slate-500">Status: </span>
            <span className="font-medium">{agent ? (agent.isActive ? 'Active' : 'Inactive') : '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleSignOut} className="min-h-11 w-full sm:w-auto">
        <LogOut aria-hidden /> Sign out
      </Button>
    </div>
  );
}
