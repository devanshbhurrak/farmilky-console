export interface DashboardStat {
  total_revenue?: number;
  total_orders?: number;
  active_subscriptions?: number;
  today_deliveries?: number;
  today_delivered?: number;
  monthly_revenue?: number;
  pending_payments?: number;
  pending_amount?: number;
  total_customers?: number;
  // Aliases for upstream compatibility
  revenueBooked?: number;
  revenue?: number;
  totalRevenue?: number;
  todayOrders?: number;
  ordersToday?: number;
  orders?: number;
  activeSubscriptions?: number;
  activeSubs?: number;
  subscriptions?: number;
  pendingDeliveries?: number;
  pendingCod?: number;
  codPending?: number;
  pendingCOD?: number;
  totalCustomers?: number;
  customers?: number;
  totalUsers?: number;
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
