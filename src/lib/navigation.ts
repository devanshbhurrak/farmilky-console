import {
  LayoutDashboard,
  ShoppingCart,
  Repeat,
  Users,
  Package,
  Truck,
  ClipboardList,
  Wallet,
  Receipt,
  Scale,
  Landmark,
  MapPin,
  UserCog,
  Milk,
  MessageSquareWarning,
  Undo2,
  CalendarOff,
  Mail,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey } from '@/types/permission';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** If set, item is visible to admins OR users holding this permission */
  permission?: PermissionKey;
  /** If true, only admins see this item */
  adminOnly?: boolean;
  /** Show in mobile bottom nav (max 4 + More) */
  bottomNav?: boolean;
  group?: 'core' | 'people' | 'finance' | 'operations' | 'support' | 'admin';
}

export const NAV_GROUPS: { key: NonNullable<NavItem['group']>; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'finance', label: 'Finance' },
  { key: 'operations', label: 'Operations' },
  { key: 'support', label: 'Support' },
  { key: 'admin', label: 'Admin' },
];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: LayoutDashboard, adminOnly: true, bottomNav: true, group: 'core' },
  { label: 'Deliveries', path: '/deliveries', icon: Truck, permission: 'delivery_board.view', bottomNav: true, group: 'operations' },
  { label: 'Collection', path: '/milk-collections', icon: Milk, adminOnly: true, bottomNav: true, group: 'operations' },
  { label: 'Customers', path: '/customers', icon: Users, adminOnly: true, bottomNav: true, group: 'people' },
  { label: 'Orders', path: '/orders', icon: ShoppingCart, adminOnly: true, group: 'operations' },
  { label: 'Subscriptions', path: '/subscriptions', icon: Repeat, adminOnly: true, group: 'operations' },
  { label: 'Products', path: '/products', icon: Package, adminOnly: true, group: 'operations' },
  { label: 'Manifests', path: '/manifests', icon: ClipboardList, adminOnly: true, group: 'operations' },
  { label: 'My Route', path: '/agent', icon: Truck, permission: 'manifest.view_today', group: 'operations' },
  { label: 'Payments', path: '/payments', icon: Wallet, adminOnly: true, group: 'finance' },
  { label: 'Invoices', path: '/invoices', icon: Receipt, adminOnly: true, group: 'finance' },
  { label: 'Balances', path: '/balances', icon: Scale, adminOnly: true, group: 'finance' },
  { label: 'Expenses', path: '/expenses', icon: Landmark, adminOnly: true, group: 'finance' },
  { label: 'Areas', path: '/areas', icon: MapPin, adminOnly: true, group: 'operations' },
  { label: 'Agents', path: '/agents', icon: UserCog, adminOnly: true, group: 'people' },
  { label: 'Suppliers', path: '/suppliers', icon: Users, adminOnly: true, group: 'people' },
  { label: 'Complaints', path: '/complaints', icon: MessageSquareWarning, adminOnly: true, group: 'support' },
  { label: 'Returns', path: '/returns', icon: Undo2, adminOnly: true, group: 'support' },
  { label: 'Holidays', path: '/holidays', icon: CalendarOff, adminOnly: true, group: 'support' },
  { label: 'Messages', path: '/messages', icon: Mail, adminOnly: true, group: 'support' },
  { label: 'Permissions', path: '/permissions', icon: KeyRound, adminOnly: true, group: 'admin' },
];

export const BOTTOM_NAV_FALLBACK: NavItem[] = NAV_ITEMS.filter((i) => i.bottomNav);
