import { getId } from '@/lib/utils';
import type { Area } from '@/types/area';
import type { Customer } from '@/types/customer';

/** Total outstanding balance for a customer (positive = money owed by customer). */
export const customerBalance = (c: Customer): number => {
  return Number(c.accountBalance ?? c.pendingAmount ?? 0);
};

/** Compact single-line address for a customer's primary address, if any. */
export const customerAddress = (c: Customer): string | null => {
  const a = c.addresses?.[0];
  if (!a) return null;
  const line = [a.street || a.line1 || a.line2, a.city, a.pincode].filter(Boolean).join(', ');
  return line || null;
};

/**
 * Enrich a customer with a resolved area name from the areas list.
 *
 * The backend returns `assignedAreaId` as a bare UUID without the area name,
 * so we map it client-side using the already-loaded areas. This keeps the
 * `CustomerCard` and detail page area displays accurate.
 */
export const enrichCustomerArea = (customer: Customer, areas: Pick<Area, 'id' | 'name'>[]): Customer => {
  const areaId = customer.deliveryConfig?.assignedArea ?? customer.areaId;
  if (!areaId) return customer;
  const areaName = areas.find((a) => getId(a) === areaId || a.id === areaId)?.name;
  if (!areaName) return customer;
  return {
    ...customer,
    areaName,
    deliveryConfig: { ...(customer.deliveryConfig ?? {}), assignedAreaName: areaName },
  };
};

/** Convenience: enrich a list of customers with area names. */
export const enrichCustomersArea = (customers: Customer[], areas: Pick<Area, 'id' | 'name'>[]): Customer[] =>
  areas.length ? customers.map((c) => enrichCustomerArea(c, areas)) : customers;