import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { SearchInput } from '@/components/data/search-input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useAdminUserSearch,
  usePermissionAssignments,
  usePermissionRegistry,
  useResetRolePermissions,
  useRolePermissions,
  useRoles,
  useSetUserPermissions,
  useUpdateRolePermissions,
} from './hooks';
import { getId } from '@/lib/utils';
import type { PermissionDefinition } from '@/types/permission';

function groupDefinitions(defs: PermissionDefinition[]): Record<string, PermissionDefinition[]> {
  const groups: Record<string, PermissionDefinition[]> = {};
  for (const d of defs) {
    const key = d.group || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }
  return groups;
}

function GroupedToggles({
  groups,
  selected,
  onToggle,
  onSetGroup,
}: {
  groups: Record<string, PermissionDefinition[]>;
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSetGroup: (keys: string[], on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([group, defs]) => {
        const keys = defs.map((d) => String(d.key));
        return (
          <Card key={group}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm">{group}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="min-h-11" onClick={() => onSetGroup(keys, true)}>
                  All
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11" onClick={() => onSetGroup(keys, false)}>
                  None
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {defs.map((d) => (
                <label key={String(d.key)} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">{d.label}</span>
                  <Switch checked={selected.has(String(d.key))} onChange={() => onToggle(String(d.key))} aria-label={d.label} />
                </label>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function PermissionsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'roles';
  const role = params.get('role') ?? 'agent';
  const userSearch = params.get('q') ?? '';
  const userRole = params.get('userRole') ?? 'agent';

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const registryQuery = usePermissionRegistry();
  const rolesQuery = useRoles();
  const rolePermsQuery = useRolePermissions(role);
  const updateRole = useUpdateRolePermissions();
  const resetRole = useResetRolePermissions();
  const assignmentsQuery = usePermissionAssignments();
  const setUserPerms = useSetUserPermissions();

  const debouncedUserSearch = useDebounce(userSearch, 400);
  const usersQuery = useAdminUserSearch(debouncedUserSearch, userRole);

  const definitions = registryQuery.data ?? [];
  const groups = React.useMemo(() => groupDefinitions(definitions), [definitions]);
  const roles = rolesQuery.data ?? [];

  const serverPerms = rolePermsQuery.data ?? [];
  const [draft, setDraft] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    setDraft(null);
  }, [role]);
  const effective = draft ?? serverPerms;
  const selected = React.useMemo(() => new Set(effective), [effective]);
  const dirty = draft !== null && JSON.stringify([...draft].sort()) !== JSON.stringify([...serverPerms].sort());

  const toggle = (key: string) => {
    const base = new Set(draft ?? serverPerms);
    if (base.has(key)) base.delete(key);
    else base.add(key);
    setDraft([...base]);
  };
  const setGroup = (keys: string[], on: boolean) => {
    const base = new Set(draft ?? serverPerms);
    for (const k of keys) {
      if (on) base.add(k);
      else base.delete(k);
    }
    setDraft([...base]);
  };

  const [resetOpen, setResetOpen] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState('');
  const [userDraft, setUserDraft] = React.useState<string[] | null>(null);

  const assignments = assignmentsQuery.data ?? [];
  const assignmentFor = (userId: string) => assignments.find((a) => String(a.userId) === userId)?.permissions.map(String) ?? [];
  const editingUser = (usersQuery.data ?? []).find((u) => getId(u) === editingUserId) ?? null;
  const userSelected = React.useMemo(() => new Set(userDraft ?? (editingUserId ? assignmentFor(editingUserId) : [])), [userDraft, editingUserId, assignments]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Permissions" description="Manage role defaults and per-user overrides" />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v })}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="flex flex-col gap-4">
          <Select aria-label="Role" value={role} onChange={(e) => set({ role: e.target.value })} className="md:max-w-70">
            {(roles.length > 0 ? roles : ['agent', 'delivery', 'delivery_partner']).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>

          {rolePermsQuery.isLoading || registryQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading permissions…</p>
          ) : (
            <GroupedToggles groups={groups} selected={selected} onToggle={toggle} onSetGroup={setGroup} />
          )}

          {dirty && (
            <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <p className="text-sm text-slate-600">Unsaved changes</p>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-11" onClick={() => setDraft(null)}>
                  Discard
                </Button>
                <Button
                  className="min-h-11"
                  loading={updateRole.isPending}
                  onClick={() => updateRole.mutate({ role, permissions: draft ?? [] }, { onSuccess: () => setDraft(null) })}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
          <div>
            <Button variant="outline" className="min-h-11" onClick={() => setResetOpen(true)}>
              Reset role to defaults
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="users" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput value={userSearch} onChange={(v) => set({ q: v })} placeholder="Search users…" className="md:max-w-70" />
            <Select aria-label="Role filter" value={userRole} onChange={(e) => set({ userRole: e.target.value })} className="md:max-w-55">
              <option value="">All roles</option>
              <option value="agent">Agent</option>
              <option value="delivery">Delivery</option>
              <option value="delivery_partner">Delivery partner</option>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            {(usersQuery.data ?? []).map((u) => {
              const id = getId(u);
              const perms = assignmentFor(id);
              return (
                <Card key={id}>
                  <CardContent className="flex items-center justify-between gap-3 pt-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="size-9 text-xs" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">
                          {u.role} · {perms.length} overrides
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => { setEditingUserId(id); setUserDraft(null); }}
                    >
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {!usersQuery.isLoading && (usersQuery.data ?? []).length === 0 && (
              <p className="text-sm text-slate-500">No users found.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={editingUserId !== ''} onOpenChange={(open) => { if (!open) { setEditingUserId(''); setUserDraft(null); } }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit permissions{editingUser ? ` — ${editingUser.name}` : ''}</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <GroupedToggles
              groups={groups}
              selected={userSelected}
              onToggle={(key) => {
                const base = new Set(userDraft ?? assignmentFor(editingUserId));
                if (base.has(key)) base.delete(key);
                else base.add(key);
                setUserDraft([...base]);
              }}
              onSetGroup={(keys, on) => {
                const base = new Set(userDraft ?? assignmentFor(editingUserId));
                for (const k of keys) {
                  if (on) base.add(k);
                  else base.delete(k);
                }
                setUserDraft([...base]);
              }}
            />
            <Button
              className="min-h-11 w-full"
              loading={setUserPerms.isPending}
              onClick={() => {
                setUserPerms.mutate(
                  { userId: editingUserId, permissions: userDraft ?? [] },
                  { onSuccess: () => { setEditingUserId(''); setUserDraft(null); } },
                );
              }}
            >
              Save user permissions
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={`Reset ${role} permissions?`}
        description="This restores the default permission set for this role."
        confirmLabel="Reset"
        loading={resetRole.isPending}
        onConfirm={() => resetRole.mutate(role, { onSuccess: () => { setResetOpen(false); setDraft(null); } })}
      />
    </div>
  );
}
