export interface DashboardStat {
  revenueBooked?: number;
  todayOrders?: number;
  activeSubscriptions?: number;
  pendingDeliveries?: number;
  pendingCod?: number;
  totalCustomers?: number;
  recentOrders?: { id: string; totalAmount?: number; status?: string; createdAt?: string; customerName?: string }[];
  recentSubscriptions?: { id: string; status?: string; createdAt?: string; customerName?: string }[];
  [key: string]: unknown;
}

export interface PerformanceRow {
  id?: string;
  name: string;
  delivered?: number;
  total?: number;
  successRate?: number;
}

export interface SupplyRow {
  product?: string;
  productName?: string;
  customers?: number;
  liters?: number;
  qty?: number;
  quantity?: number;
  amount?: number;
}

export interface ProfitSlice {
  revenue?: number;
  expenses?: number;
  profit?: number;
}

export interface ProfitData {
  today?: ProfitSlice;
  month?: ProfitSlice;
}
