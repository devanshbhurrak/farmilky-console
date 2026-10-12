export type PermissionKey =
  | 'profile.view'
  | 'profile.update'
  | 'manifest.view_today'
  | 'manifest.view_history'
  | 'manifest.update'
  | 'delivery_board.view'
  | 'collection.record'
  | 'collection.view_history'
  | 'customer.view_basic'
  | 'area.view';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  group: string;
}

export interface PermissionAssignment {
  userId: string;
  permissions: PermissionKey[];
  user?: { id: string; name: string; role: string; phone?: string | null };
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { key: 'profile.view', label: 'View profile', group: 'Profile' },
  { key: 'profile.update', label: 'Update profile', group: 'Profile' },
  { key: 'manifest.view_today', label: "View today's manifest", group: 'Manifests' },
  { key: 'manifest.view_history', label: 'View manifest history', group: 'Manifests' },
  { key: 'manifest.update', label: 'Update manifest entries', group: 'Manifests' },
  { key: 'delivery_board.view', label: 'View delivery board', group: 'Deliveries' },
  { key: 'collection.record', label: 'Record milk collection', group: 'Collections' },
  { key: 'collection.view_history', label: 'View collection history', group: 'Collections' },
  { key: 'customer.view_basic', label: 'View basic customer info', group: 'Customers' },
  { key: 'area.view', label: 'View areas', group: 'Areas' },
];
