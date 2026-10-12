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
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: LayoutDashboard, adminOnly: true, bottomNav: true },
  { label: 'Deliveries', path: '/deliveries', icon: Truck, permission: 'delivery_board.view', bottomNav: true },
  { label: 'Orders', path: '/orders', icon: ShoppingCart, adminOnly: true, bottomNav: true },
  { label: 'Subscriptions', path: '/subscriptions', icon: Repeat, adminOnly: true, bottomNav: true },
  { label: 'Customers', path: '/customers', icon: Users, adminOnly: true },
  { label: 'Products', path: '/products', icon: Package, adminOnly: true },
  { label: 'Manifests', path: '/manifests', icon: ClipboardList, adminOnly: true },
  { label: 'My Route', path: '/agent', icon: Truck, permission: 'manifest.view_today' },
  { label: 'Payments', path: '/payments', icon: Wallet, adminOnly: true },
  { label: 'Invoices', path: '/invoices', icon: Receipt, adminOnly: true },
  { label: 'Balances', path: '/balances', icon: Scale, adminOnly: true },
  { label: 'Expenses', path: '/expenses', icon: Landmark, adminOnly: true },
  { label: 'Areas', path: '/areas', icon: MapPin, adminOnly: true },
  { label: 'Agents', path: '/agents', icon: UserCog, adminOnly: true },
  { label: 'Suppliers', path: '/suppliers', icon: Users, adminOnly: true },
  { label: 'Milk Collection', path: '/milk-collections', icon: Milk, adminOnly: true },
  { label: 'Complaints', path: '/complaints', icon: MessageSquareWarning, adminOnly: true },
  { label: 'Returns', path: '/returns', icon: Undo2, adminOnly: true },
  { label: 'Holidays', path: '/holidays', icon: CalendarOff, adminOnly: true },
  { label: 'Messages', path: '/messages', icon: Mail, adminOnly: true },
  { label: 'Permissions', path: '/permissions', icon: KeyRound, adminOnly: true },
];

export const BOTTOM_NAV_FALLBACK: NavItem[] = NAV_ITEMS.filter((i) => i.bottomNav);
