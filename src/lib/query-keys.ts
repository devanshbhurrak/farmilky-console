export const queryKeys = {
  auth: {
    profile: () => ['auth', 'profile'] as const,
    permissions: () => ['auth', 'permissions'] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    list: (filters: unknown) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  subscriptions: {
    all: () => ['subscriptions'] as const,
    list: (filters: unknown) => ['subscriptions', 'list', filters] as const,
    detail: (id: string) => ['subscriptions', 'detail', id] as const,
    deliveryBoard: (date: string, slot: string) => ['subscriptions', 'delivery-board', date, slot] as const,
    todaySupply: () => ['subscriptions', 'today-supply'] as const,
  },
  customers: {
    all: () => ['customers'] as const,
    list: (filters: unknown) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  products: {
    all: () => ['products'] as const,
    list: (filters: unknown) => ['products', 'list', filters] as const,
  },
  invoices: {
    all: () => ['invoices'] as const,
    list: (filters: unknown) => ['invoices', 'list', filters] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  payments: {
    all: () => ['payments'] as const,
    list: (filters: unknown) => ['payments', 'list', filters] as const,
    passbook: (userId: string) => ['payments', 'passbook', userId] as const,
    ledger: (userId: string) => ['payments', 'ledger', userId] as const,
    supplier: (filters: unknown) => ['payments', 'supplier', filters] as const,
  },
  expenses: {
    all: () => ['expenses'] as const,
    list: (filters: unknown) => ['expenses', 'list', filters] as const,
    summary: (filters: unknown) => ['expenses', 'summary', filters] as const,
  },
  areas: {
    all: () => ['areas'] as const,
    list: () => ['areas', 'list'] as const,
    customers: (areaId: string) => ['areas', areaId, 'customers'] as const,
  },
  agents: {
    all: () => ['agents'] as const,
    list: (filters: unknown) => ['agents', 'list', filters] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
    dashboard: () => ['agents', 'dashboard'] as const,
  },
  manifests: {
    all: () => ['manifests'] as const,
    list: (filters: unknown) => ['manifests', 'list', filters] as const,
    detail: (id: string) => ['manifests', 'detail', id] as const,
    today: () => ['manifests', 'my-today'] as const,
    history: (filters: unknown) => ['manifests', 'my-history', filters] as const,
  },
  suppliers: {
    all: () => ['suppliers'] as const,
    list: (filters: unknown) => ['suppliers', 'list', filters] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
  },
  milkCollections: {
    all: () => ['milk-collections'] as const,
    list: (filters: unknown) => ['milk-collections', 'list', filters] as const,
    daily: (date: string) => ['milk-collections', 'daily', date] as const,
    todayShift: () => ['milk-collections', 'today-shift'] as const,
    history: (filters: unknown) => ['milk-collections', 'history', filters] as const,
  },
  complaints: {
    all: () => ['complaints'] as const,
    list: (filters: unknown) => ['complaints', 'list', filters] as const,
  },
  returns: {
    all: () => ['returns'] as const,
    list: (filters: unknown) => ['returns', 'list', filters] as const,
  },
  holidays: {
    all: () => ['holidays'] as const,
    list: (filters: unknown) => ['holidays', 'list', filters] as const,
  },
  contact: {
    all: () => ['contact'] as const,
    list: (filters: unknown) => ['contact', 'list', filters] as const,
  },
  permissions: {
    all: () => ['permissions'] as const,
    my: () => ['permissions', 'my'] as const,
    registry: () => ['permissions', 'registry'] as const,
    roles: () => ['permissions', 'roles'] as const,
    user: (userId: string) => ['permissions', 'user', userId] as const,
  },
  transactions: {
    list: (filters: unknown) => ['transactions', 'list', filters] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    deliveryPerformance: () => ['admin', 'delivery-performance'] as const,
    deliveryStats: () => ['admin', 'delivery-stats'] as const,
    profitStats: () => ['admin', 'profit-stats'] as const,
  },
  balances: {
    list: (filters: unknown) => ['balances', 'list', filters] as const,
  },
} as const;
