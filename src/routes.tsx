import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AuthGuard } from '@/features/auth/auth-guard';
import { AdminGuard } from '@/features/auth/admin-guard';
import { PermissionGuard } from '@/features/auth/permission-guard';
import { PageSkeleton } from '@/components/feedback/page-skeleton';

const LoginPage = lazy(() => import('@/features/auth/login-page'));

const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page'));
const DeliveriesPage = lazy(() => import('@/features/deliveries/deliveries-page'));
const OrdersPage = lazy(() => import('@/features/orders/orders-page'));
const OrderDetailPage = lazy(() => import('@/features/orders/order-detail-page'));
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/subscriptions-page'));
const SubscriptionDetailPage = lazy(() => import('@/features/subscriptions/subscription-detail-page'));
const CustomersPage = lazy(() => import('@/features/customers/customers-page'));
const CustomerDetailPage = lazy(() => import('@/features/customers/customer-detail-page'));
const ProductsPage = lazy(() => import('@/features/products/products-page'));
const PaymentsPage = lazy(() => import('@/features/payments/payments-page'));
const ExpensesPage = lazy(() => import('@/features/expenses/expenses-page'));
const InvoicesPage = lazy(() => import('@/features/invoices/invoices-page'));
const InvoiceDetailPage = lazy(() => import('@/features/invoices/invoice-detail-page'));
const BalancesPage = lazy(() => import('@/features/balances/balances-page'));
const AreasPage = lazy(() => import('@/features/areas/areas-page'));
const AreaCustomersPage = lazy(() => import('@/features/areas/area-customers-page'));
const AgentsPage = lazy(() => import('@/features/agents/agents-page'));
const AgentDetailPage = lazy(() => import('@/features/agents/agent-detail-page'));
const AgentDashboardPage = lazy(() => import('@/features/agents/agent-dashboard-page'));
const AgentProfilePage = lazy(() => import('@/features/agents/agent-profile-page'));
const ManifestsPage = lazy(() => import('@/features/manifests/manifests-page'));
const ManifestDetailPage = lazy(() => import('@/features/manifests/manifest-detail-page'));
const SuppliersPage = lazy(() => import('@/features/suppliers/suppliers-page'));
const SupplierDetailPage = lazy(() => import('@/features/suppliers/supplier-detail-page'));
const MilkCollectionsPage = lazy(() => import('@/features/milk-collections/milk-collections-page'));
const ComplaintsPage = lazy(() => import('@/features/complaints/complaints-page'));
const ReturnsPage = lazy(() => import('@/features/returns/returns-page'));
const HolidaysPage = lazy(() => import('@/features/holidays/holidays-page'));
const ContactMessagesPage = lazy(() => import('@/features/contact/contact-messages-page'));
const PermissionsPage = lazy(() => import('@/features/permissions/permissions-page'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            {/* Admin routes */}
            <Route element={<AdminGuard />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="balances" element={<BalancesPage />} />
              <Route path="areas" element={<AreasPage />} />
              <Route path="areas/:id/customers" element={<AreaCustomersPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/:id" element={<AgentDetailPage />} />
              <Route path="complaints" element={<ComplaintsPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="holidays" element={<HolidaysPage />} />
              <Route path="messages" element={<ContactMessagesPage />} />
              <Route path="manifests" element={<ManifestsPage />} />
              <Route path="manifests/:id" element={<ManifestDetailPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="milk-collections" element={<MilkCollectionsPage />} />
              <Route path="permissions" element={<PermissionsPage />} />
            </Route>

            {/* Permission-gated delivery routes */}
            <Route element={<PermissionGuard permission="delivery_board.view" />}>
              <Route path="deliveries" element={<DeliveriesPage />} />
            </Route>

            {/* Agent routes */}
            <Route path="agent" element={<PermissionGuard permission="manifest.view_today" />}>
              <Route index element={<AgentDashboardPage />} />
              <Route path="manifest/:id" element={<ManifestDetailPage />} />
            </Route>
            <Route element={<PermissionGuard permission="collection.view_history" />}>
              <Route path="agent/collections" element={<MilkCollectionsPage />} />
            </Route>
            <Route element={<PermissionGuard permission="manifest.view_history" />}>
              <Route path="agent/history" element={<ManifestsPage />} />
            </Route>
            <Route element={<PermissionGuard permission="profile.view" />}>
              <Route path="agent/profile" element={<AgentProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
