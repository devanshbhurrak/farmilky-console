# Farmilky Management v2 — Architecture & Design Document

> Complete redesign blueprint for the `farmilky-management` admin portal.  
> **Stack:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + TanStack Query v5  
> **Backend:** `backend-v2` (Hono + Drizzle + PostgreSQL)

---

## Table of Contents

1. [Current Application Analysis](#1-current-application-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Complete Feature Structure](#3-complete-feature-structure)
4. [Mobile-First UI/UX Architecture](#4-mobile-first-uiux-architecture)
5. [Design System](#5-design-system)
6. [Backend-v2 Integration](#6-backend-v2-integration)
7. [Recommended Implementation Structure](#7-recommended-implementation-structure)
8. [Migration/Rebuild Strategy](#8-migrationrebuild-strategy)
9. [Quality Standards](#9-quality-standards)
10. [Cloudflare Pages Deployment](#10-cloudflare-pages-deployment)
11. [Production Readiness (50+ Users)](#11-production-readiness-50-users)
12. [References](#12-references)

---

## 1. Current Application Analysis

### 1.1 Existing Architecture

```
farmilky-management/src/
├── api/client.js               # Single apiRequest() wrapper around fetch
├── App.jsx                     # All routes, layout shell, 2 inline status-update handlers
├── main.jsx                    # Entry point (AuthProvider → PortalDataProvider → App)
├── context/
│   ├── AuthContext.jsx          # User state, JWT cookie auth, permissions, login/logout
│   └── PortalDataContext.jsx    # Dashboard aggregate data (delivery board, orders, subs, supply)
├── hooks/
│   ├── useApiData.js            # Generic fetch hook with in-memory Map cache + portal:refresh events
│   ├── usePaginatedFetch.js     # Paginated list hook with search/filter/sort/abort
│   ├── useAction.js             # Mutation wrapper (loading/error state for POST/PUT/DELETE)
│   ├── usePermission.js         # Thin wrapper around AuthContext.hasPermission
│   ├── useDebounce.js           # Debounced value
│   ├── useMediaQuery.js         # CSS media-query hook
│   ├── useBodyScrollLock.js     # Lock body scroll (modals)
│   └── useFocusTrap.js          # Focus trap for accessibility
├── components/
│   ├── layout/ (9 files)        # Sidebar, Topbar, BottomNav, MobileHeader, MobileDrawer, route guards
│   ├── ui/ (25 files)           # DataTable, Modal, BottomSheet, FilterSheet, StatusTag, Pagination, etc.
│   ├── customer/                # CustomerForm
│   ├── order/                   # OrderForm
│   ├── product/                 # ProductForm
│   ├── subscription/ (2 files)  # SubscriptionForm, DeliveryHistoryForm
│   ├── invoice/ (2 files)       # GenerateInvoiceModal, CustomInvoiceModal
│   ├── delivery/ (7 files)      # DeliveryCard, DeliveryFilters, OutcomeModal, BulkActionsBar, etc.
│   └── icons/                   # NavIcon
├── pages/ (29 files)            # One file per page — flat, no grouping
├── styles/
│   ├── variables.css            # Design tokens as CSS custom properties
│   ├── layout.css, components.css, tables.css, forms.css, responsive.css
│   └── pages/ (16 files)        # Per-page CSS files
└── utils/
    ├── constants.js             # Nav items, status options, category enums
    └── format.js                # Currency, date, time formatters
```

**Tech stack:** React 19, Vite 8, React Router 7, react-hot-toast, lucide-react, qrcode.react — **no TypeScript, no Tailwind, no query library**.

### 1.2 Existing Features & Workflows

| Module | Pages | Key Functionality |
|--------|-------|-------------------|
| **Dashboard** | DashboardPage | Revenue metrics, today's ops (deliveries + milk collection), profit overview (today/month), load sheet, recent orders/subscriptions, agent/area performance |
| **Auth** | LoginPage | Username/password login, cookie-based JWT, role-gated routing (admin vs delivery partner) |
| **Delivery Board** | DeliveriesPage | Real-time delivery tracking by date/slot, bulk actions (deliver all, confirm), outcome recording (delivered/skipped/partial/extra/failed), customer grouping, extra products |
| **Orders** | OrdersPage, OrderDetailPage | List with pagination/search/filters, create/edit orders, status transitions (confirmed→delivered→cancelled), delivery outcome, instant delivery |
| **Subscriptions** | SubscriptionsPage, SubscriptionDetailPage | List with pagination, create/edit subscriptions, status management (active/paused/cancelled), delivery history, schedule (daily/alternate/weekly/custom), quantity/price changes |
| **Customers** | CustomersPage, CustomerDetailPage | List with search, create/edit customer, customer detail with orders/subscriptions/payments/balance tabs, area assignment |
| **Products** | ProductsPage | CRUD for product catalog, category/unit management, pricing, variants |
| **Payments** | PaymentsPage | Payment recording, payment method tracking, customer payment history |
| **Invoices** | InvoicesPage, InvoiceDetailPage | Invoice generation (auto + custom), invoice detail with line items, status management (draft→sent→paid), PDF/WhatsApp sharing |
| **Balances** | BalancesPage | Outstanding balance overview by customer, balance adjustments |
| **Expenses** | ExpensesPage | Expense tracking with categories (fuel, packaging, salaries, etc.), payment method, date range filters |
| **Areas** | AreasPage, AreaCustomersPage | Area CRUD, customer-to-area mapping, area-wise customer list |
| **Agents** | AgentsPage, AgentDetailPage, AgentDashboardPage | Agent CRUD, delivery config, agent performance, agent's own dashboard with today's manifest |
| **Manifests** | ManifestsPage, ManifestDetailPage | Delivery run sheets, manifest generation, entry status tracking, agent assignment |
| **Suppliers** | SuppliersPage, SupplierDetailPage | Supplier CRUD, supplier payments, payment history |
| **Milk Collections** | MilkCollectionsPage | Daily collection recording by supplier/session, confirmation workflow, shift summaries |
| **Complaints** | ComplaintsPage | Complaint tracking with categories, status management (open→in_progress→resolved→closed), reference linking |
| **Returns** | ReturnsPage | Return requests, approval/rejection workflow, refund processing |
| **Holidays** | HolidaysPage | Delivery holiday calendar management |
| **Contact Messages** | ContactMessagesPage | Inbound customer messages, read/replied status |
| **Permissions** | PermissionsPage | Role-based permission assignment for delivery partners/agents |

### 1.3 Current Problems & Technical Debt

#### Architecture Issues
1. **No TypeScript** — Zero type safety across 80+ JSX/JS files. API response shapes are untyped. Refactoring is risky.
2. **CSS custom properties + 16 per-page CSS files** — ~2500 lines of hand-written CSS. No utility-first approach. Massive duplication of padding/margin/color patterns. Hard to maintain consistency.
3. **Flat page structure** — All 29 pages in one directory with no feature grouping. No shared logic between related pages (e.g., OrdersPage and OrderDetailPage share nothing).
4. **Home-grown data fetching** — `useApiData` and `usePaginatedFetch` are custom hooks with a basic `Map()` cache. No automatic cache invalidation, no optimistic updates, no background refetching, no deduplication. The `portal:refresh` event is a brittle global bus.
5. **PortalDataContext loads everything at once** — Dashboard data (all orders, all subscriptions, delivery board, supply) is fetched on every auth, even if the user navigates directly to a non-dashboard page. This is wasteful and creates stale data issues.
6. **Business logic in App.jsx** — `handleOrderStatusUpdate` and `handleSubscriptionStatusUpdate` are defined in the root component and threaded as props. These belong in feature-specific hooks.
7. **Inline API paths** — Every page constructs its own `/api/...` strings. No centralized API route map. Typos are undetectable.
8. **No form validation** — Forms use uncontrolled DOM state or basic `useState`. No schema validation (Zod), no field-level error handling, no dirty/touched tracking.

#### Data Fetching Issues
9. **Hardcoded array key detection** — `usePaginatedFetch` has a hardcoded list of candidate keys (`["users","orders",...]`) to find the data array in responses. Brittle and error-prone.
10. **No request deduplication** — Multiple components can trigger the same API call simultaneously.
11. **Manual cache invalidation** — Cache is either cleared entirely (`clearApiCache()`) or not at all. No granular invalidation.
12. **Error handling inconsistency** — Some pages use `toast.error()`, some use `setError()`, some silently catch. No unified error boundary per feature.

#### UI/UX Issues
13. **CSS specificity wars** — Global styles + per-page styles create conflicts. Many `!important` overrides likely exist.
14. **Inconsistent component APIs** — DataTable, Modal, BottomSheet each have slightly different prop conventions.
15. **No skeleton/loading consistency** — Some pages use `LoadingScreen`, others use `LoadingSkeleton`, some use raw conditional rendering.

#### Known Bugs (from prior audit)
16. **ReturnsPage** — Uses old backend endpoint paths (`/api/return/admin/...`) that may not match `backend-v2` routes (`/api/returns/...`).
17. **Dashboard revenue** — Calculates revenue client-side from raw order array. Should use backend aggregate endpoint.
18. **DeliveriesPage dependency array** — Some `useEffect` dependencies may be stale.

### 1.4 API Path Mismatch: Current Frontend vs backend-v2

The current frontend was built against the old Express `backend`. The new `backend-v2` uses different route prefixes:

| Current Frontend Path | backend-v2 Path |
|----------------------|-----------------|
| `/api/user/login` | `/api/users/login` |
| `/api/user/logout` | `/api/users/logout` |
| `/api/user/profile` | `/api/users/profile` |
| `/api/user/admin/all` | `/api/users/admin/all` |
| `/api/order/admin/...` | `/api/orders/admin/...` |
| `/api/subscriptions/admin/...` | `/api/subscriptions/admin/...` (same) |
| `/api/return/admin/...` | `/api/returns/...` |
| `/api/permissions/my` | `/api/permissions/my` |
| `/api/admin/...` | `/api/admin/...` (same) |
| `/api/milk-collections/...` | `/api/milk-collections/...` (same) |

The redesign must target `backend-v2` paths exclusively.

---

## 2. Proposed Architecture

### 2.1 Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Language** | TypeScript 5.x (strict mode) | Type safety, IDE support, refactoring confidence |
| **Framework** | React 19 + Vite 8 | Fast HMR, ESM-native, tree-shaking |
| **Styling** | Tailwind CSS v4 | Utility-first, zero custom CSS, design tokens via `@theme` |
| **Data Fetching** | TanStack Query v5 | Caching, dedup, background refetch, optimistic updates, devtools |
| **Forms** | React Hook Form + Zod | Schema validation, minimal re-renders, TS-inferred types |
| **Routing** | React Router v7 | Stable, nested routes, loaders/actions if needed |
| **UI Primitives** | Radix UI (headless) | Accessible dialogs, popovers, dropdowns — unstyled, Tailwind-friendly |
| **Icons** | Lucide React | Already in use, tree-shakeable |
| **Notifications** | Sonner | Modern toast library, Tailwind-native, better DX than react-hot-toast |
| **Date Handling** | date-fns | Tree-shakeable, pure functions, no mutation |
| **Charts** | Recharts (if needed) | For dashboard visualizations |
| **PDF** | @react-pdf/renderer | Invoice PDF generation (if client-side) |
| **QR** | qrcode.react | UPI QR codes (already in use) |

### 2.2 Project Structure

```
farmilky-management-v2/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                  # Entry point
    ├── app.tsx                   # Root component (providers + router)
    ├── routes.tsx                # All route definitions (single source of truth)
    ├── vite-env.d.ts
    │
    ├── lib/                      # Framework-level utilities (thin, shared, no business logic)
    │   ├── api-client.ts         # Configured fetch wrapper (base URL, auth headers, error handling)
    │   ├── query-client.ts       # TanStack Query client configuration
    │   ├── query-keys.ts         # Centralized query key factory
    │   └── utils.ts              # cn(), formatCurrency(), formatDate(), etc.
    │
    ├── types/                    # Shared TypeScript types (mirrors backend-v2 schemas)
    │   ├── auth.ts               # AuthUser, LoginRequest, LoginResponse
    │   ├── order.ts              # Order, OrderStatus, CreateOrderPayload, etc.
    │   ├── subscription.ts       # Subscription, SubscriptionStatus, etc.
    │   ├── customer.ts           # Customer, Address, etc.
    │   ├── product.ts            # Product, ProductCategory, Variant, etc.
    │   ├── delivery.ts           # DeliveryEntry, DeliveryOutcome, etc.
    │   ├── invoice.ts            # Invoice, InvoiceStatus, LineItem, etc.
    │   ├── payment.ts            # Payment, PaymentMethod, Transaction, etc.
    │   ├── manifest.ts           # Manifest, ManifestEntry, ManifestStatus, etc.
    │   ├── agent.ts              # Agent, AgentConfig, etc.
    │   ├── area.ts               # Area
    │   ├── supplier.ts           # Supplier, MilkCollection, SupplierPayment
    │   ├── expense.ts            # Expense, ExpenseCategory
    │   ├── complaint.ts          # Complaint, ComplaintStatus, ComplaintCategory
    │   ├── return.ts             # Return, ReturnStatus
    │   ├── holiday.ts            # Holiday
    │   ├── contact.ts            # ContactMessage, ContactStatus
    │   ├── permission.ts         # Permission, PermissionKey
    │   ├── transaction.ts        # Transaction, TransactionType, Balance, PartyType
    │   ├── common.ts             # PaginationMeta, ApiResponse<T>, PaginatedResponse<T>
    │   └── index.ts              # Re-exports
    │
    ├── hooks/                    # Shared hooks (not feature-specific)
    │   ├── use-auth.ts           # Auth state + actions
    │   ├── use-permission.ts     # Permission check
    │   ├── use-media-query.ts    # Responsive breakpoint detection
    │   └── use-debounce.ts       # Debounced value
    │
    ├── components/               # Shared UI components (design system)
    │   ├── ui/                   # Primitive UI components
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── textarea.tsx
    │   │   ├── select.tsx
    │   │   ├── checkbox.tsx
    │   │   ├── switch.tsx
    │   │   ├── label.tsx
    │   │   ├── badge.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx         # Modal/dialog (Radix)
    │   │   ├── sheet.tsx          # Side drawer / bottom sheet (Radix)
    │   │   ├── dropdown-menu.tsx  # Dropdown (Radix)
    │   │   ├── popover.tsx        # Popover (Radix)
    │   │   ├── tabs.tsx           # Tab navigation (Radix)
    │   │   ├── separator.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── spinner.tsx
    │   │   ├── avatar.tsx
    │   │   ├── tooltip.tsx
    │   │   └── scroll-area.tsx
    │   │
    │   ├── data/                  # Data display components
    │   │   ├── data-table.tsx     # Generic table with sorting, pagination, selection
    │   │   ├── data-list.tsx      # Mobile-friendly card/list view
    │   │   ├── pagination.tsx
    │   │   ├── empty-state.tsx
    │   │   ├── error-state.tsx
    │   │   ├── search-input.tsx
    │   │   ├── filter-bar.tsx     # Filter chips + sheet trigger
    │   │   └── status-badge.tsx   # Semantic status rendering
    │   │
    │   ├── layout/               # Layout components
    │   │   ├── app-shell.tsx      # Sidebar + main area container
    │   │   ├── sidebar.tsx        # Desktop sidebar
    │   │   ├── top-bar.tsx        # Desktop top bar
    │   │   ├── bottom-nav.tsx     # Mobile bottom navigation
    │   │   ├── mobile-header.tsx  # Mobile header
    │   │   ├── mobile-drawer.tsx  # Mobile "more" drawer
    │   │   ├── page-header.tsx    # Page title + breadcrumbs + actions
    │   │   └── breadcrumbs.tsx
    │   │
    │   ├── feedback/             # Feedback & state components
    │   │   ├── confirm-dialog.tsx # Destructive action confirmation
    │   │   ├── loading-screen.tsx # Full-page loading
    │   │   ├── page-skeleton.tsx  # Page-level skeleton
    │   │   └── error-boundary.tsx # React error boundary
    │   │
    │   └── form/                 # Form components (integrates with react-hook-form)
    │       ├── form-field.tsx     # Label + input + error wrapper
    │       ├── form-select.tsx    # Select with react-hook-form register
    │       ├── form-date.tsx      # Date input
    │       ├── form-textarea.tsx
    │       └── form-section.tsx   # Grouped form fields with heading
    │
    ├── features/                 # Feature modules (business logic + UI)
    │   ├── auth/
    │   │   ├── api.ts            # login(), logout(), getProfile()
    │   │   ├── auth-provider.tsx  # AuthContext + provider
    │   │   ├── login-page.tsx
    │   │   ├── auth-guard.tsx    # Protected route wrapper
    │   │   ├── admin-guard.tsx   # Admin-only route wrapper
    │   │   ├── permission-guard.tsx # Permission-gated route wrapper
    │   │   └── schemas.ts        # Zod: loginSchema
    │   │
    │   ├── dashboard/
    │   │   ├── api.ts            # fetchDeliveryPerformance, fetchProfitStats, etc.
    │   │   ├── hooks.ts          # useDashboardData(), useProfitStats()
    │   │   ├── dashboard-page.tsx
    │   │   ├── components/
    │   │   │   ├── metric-cards.tsx
    │   │   │   ├── profit-panel.tsx
    │   │   │   ├── operations-panel.tsx
    │   │   │   ├── load-sheet.tsx
    │   │   │   ├── recent-activity.tsx
    │   │   │   ├── performance-panel.tsx
    │   │   │   └── section-navigator.tsx
    │   │   └── types.ts          # Dashboard-specific derived types
    │   │
    │   ├── deliveries/
    │   │   ├── api.ts            # fetchDeliveryBoard(), recordOutcome(), bulkDeliver()
    │   │   ├── hooks.ts          # useDeliveryBoard(), useRecordOutcome()
    │   │   ├── deliveries-page.tsx
    │   │   ├── components/
    │   │   │   ├── delivery-card.tsx
    │   │   │   ├── delivery-filters.tsx
    │   │   │   ├── customer-group.tsx
    │   │   │   ├── outcome-form.tsx
    │   │   │   ├── outcome-sheet.tsx
    │   │   │   ├── bulk-actions-bar.tsx
    │   │   │   ├── customer-confirm-drawer.tsx
    │   │   │   └── extra-products-section.tsx
    │   │   └── schemas.ts        # Zod: outcomeSchema
    │   │
    │   ├── orders/
    │   │   ├── api.ts            # listOrders(), getOrder(), createOrder(), updateOrder()
    │   │   ├── hooks.ts          # useOrders(), useOrder(), useCreateOrder()
    │   │   ├── orders-page.tsx
    │   │   ├── order-detail-page.tsx
    │   │   ├── components/
    │   │   │   ├── order-form.tsx
    │   │   │   ├── order-table.tsx
    │   │   │   └── order-status-actions.tsx
    │   │   └── schemas.ts        # Zod: createOrderSchema, updateOrderSchema
    │   │
    │   ├── subscriptions/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── subscriptions-page.tsx
    │   │   ├── subscription-detail-page.tsx
    │   │   ├── components/
    │   │   │   ├── subscription-form.tsx
    │   │   │   ├── subscription-table.tsx
    │   │   │   ├── delivery-history.tsx
    │   │   │   ├── schedule-config.tsx
    │   │   │   └── subscription-bulk-actions.tsx  # Bulk pause/resume selected rows
    │   │   └── schemas.ts
    │   │
    │   ├── customers/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── customers-page.tsx
    │   │   ├── customer-detail-page.tsx
    │   │   ├── components/
    │   │   │   ├── customer-form.tsx
    │   │   │   ├── customer-table.tsx
    │   │   │   ├── customer-orders-tab.tsx
    │   │   │   ├── customer-subscriptions-tab.tsx
    │   │   │   ├── customer-payments-tab.tsx
    │   │   │   └── customer-balance-tab.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── products/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── products-page.tsx
    │   │   ├── components/
    │   │   │   ├── product-form.tsx
    │   │   │   └── product-card.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── invoices/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── invoices-page.tsx
    │   │   ├── invoice-detail-page.tsx  # Includes PDF download button + WhatsApp send + UPI QR
    │   │   ├── components/
    │   │   │   ├── generate-invoice-dialog.tsx  # Generate for one customer (by period)
    │   │   │   ├── bulk-generate-dialog.tsx      # Bulk generate for all customers
    │   │   │   ├── invoice-table.tsx
    │   │   │   ├── invoice-line-items.tsx
    │   │   │   └── upi-qr-section.tsx            # UPI QR code in invoice detail
    │   │   └── schemas.ts
    │   │
    │   ├── payments/
    │   │   ├── api.ts            # Customer payments + supplier payments (both on one page)
    │   │   ├── hooks.ts
    │   │   ├── payments-page.tsx  # Two tabs: "Customer Payments" + "Supplier Payments"
    │   │   ├── components/
    │   │   │   ├── customer-payment-form.tsx
    │   │   │   ├── customer-payment-table.tsx
    │   │   │   ├── supplier-payment-form.tsx
    │   │   │   └── supplier-payment-table.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── balances/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   └── balances-page.tsx
    │   │
    │   ├── expenses/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── expenses-page.tsx
    │   │   ├── components/
    │   │   │   ├── expense-form.tsx
    │   │   │   └── expense-table.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── areas/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── areas-page.tsx
    │   │   ├── area-customers-page.tsx  # Drag-and-drop sequence reorder + assign/remove customers
    │   │   ├── components/
    │   │   │   ├── area-form.tsx
    │   │   │   ├── area-card.tsx
    │   │   │   └── area-customer-list.tsx  # Sortable list with drag handles
    │   │   └── schemas.ts
    │   │
    │   ├── agents/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── agents-page.tsx
    │   │   ├── agent-detail-page.tsx
    │   │   ├── agent-dashboard-page.tsx  # Agent's own view
    │   │   ├── components/
    │   │   │   ├── agent-form.tsx
    │   │   │   ├── agent-table.tsx
    │   │   │   └── delivery-config-form.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── manifests/
    │   │   ├── api.ts            # Admin: list/generate/resequence; Agent: my-today/my-history/update-entry
    │   │   ├── hooks.ts
    │   │   ├── manifests-page.tsx
    │   │   ├── manifest-detail-page.tsx
    │   │   ├── components/
    │   │   │   ├── manifest-table.tsx
    │   │   │   ├── manifest-entry-card.tsx
    │   │   │   └── resequence-dialog.tsx  # Admin: drag-to-reorder delivery sequence
    │   │   └── schemas.ts
    │   │
    │   ├── suppliers/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── suppliers-page.tsx
    │   │   ├── supplier-detail-page.tsx
    │   │   ├── components/
    │   │   │   ├── supplier-form.tsx
    │   │   │   └── supplier-payment-form.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── milk-collections/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── milk-collections-page.tsx
    │   │   ├── components/
    │   │   │   ├── collection-form.tsx
    │   │   │   └── shift-summary.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── complaints/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── complaints-page.tsx
    │   │   ├── components/
    │   │   │   └── complaint-form.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── returns/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── returns-page.tsx
    │   │   ├── components/
    │   │   │   └── return-action-form.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── holidays/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   ├── holidays-page.tsx
    │   │   ├── components/
    │   │   │   └── holiday-form.tsx
    │   │   └── schemas.ts
    │   │
    │   ├── contact/
    │   │   ├── api.ts
    │   │   ├── hooks.ts
    │   │   └── contact-messages-page.tsx
    │   │
    │   └── permissions/
    │       ├── api.ts
    │       ├── hooks.ts
    │       ├── permissions-page.tsx
    │       └── schemas.ts
    │
    └── styles/
        └── globals.css           # Tailwind directives + minimal global resets
```

### 2.3 State Management Strategy

**No global state store.** The app uses three layers:

| Layer | Tool | Scope |
|-------|------|-------|
| **Server State** | TanStack Query v5 | All API data. Cached, deduplicated, auto-refetched. This replaces `useApiData`, `usePaginatedFetch`, `PortalDataContext`. |
| **Auth State** | React Context | User session, permissions. Single `AuthProvider` at the root. |
| **UI State** | React `useState` / URL params | Filters, pagination, modal open/close, form state. Persisted in URL where appropriate (page, search, filters). |

**Key decisions:**
- **No Redux/Zustand.** The app is read-heavy with minimal cross-feature state sharing. TanStack Query handles 90% of state.
- **URL-driven filters.** Search, page, and filter values live in URL search params via `useSearchParams()`. This enables bookmarkable/shareable filtered views and back-button support.
- **Query key factory.** All query keys are centralized in `lib/query-keys.ts` to ensure consistent invalidation.

### 2.4 Query Key Factory

```typescript
// lib/query-keys.ts
export const queryKeys = {
  auth: {
    profile: () => ['auth', 'profile'] as const,
    permissions: () => ['auth', 'permissions'] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    list: (filters: Record<string, unknown>) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  subscriptions: {
    all: () => ['subscriptions'] as const,
    list: (filters: Record<string, unknown>) => ['subscriptions', 'list', filters] as const,
    detail: (id: string) => ['subscriptions', 'detail', id] as const,
    deliveryBoard: (date: string, slot: string) => ['subscriptions', 'delivery-board', date, slot] as const,
    todaySupply: () => ['subscriptions', 'today-supply'] as const,
  },
  customers: {
    all: () => ['customers'] as const,
    list: (filters: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  products: {
    all: () => ['products'] as const,
    list: (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
  },
  invoices: {
    all: () => ['invoices'] as const,
    list: (filters: Record<string, unknown>) => ['invoices', 'list', filters] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  payments: {
    all: () => ['payments'] as const,
    list: (filters: Record<string, unknown>) => ['payments', 'list', filters] as const,
  },
  expenses: {
    all: () => ['expenses'] as const,
    list: (filters: Record<string, unknown>) => ['expenses', 'list', filters] as const,
  },
  areas: {
    all: () => ['areas'] as const,
    list: () => ['areas', 'list'] as const,
    customers: (areaId: string) => ['areas', areaId, 'customers'] as const,
  },
  agents: {
    all: () => ['agents'] as const,
    list: (filters: Record<string, unknown>) => ['agents', 'list', filters] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
    dashboard: () => ['agents', 'dashboard'] as const,
  },
  manifests: {
    all: () => ['manifests'] as const,
    list: (filters: Record<string, unknown>) => ['manifests', 'list', filters] as const,
    detail: (id: string) => ['manifests', 'detail', id] as const,
  },
  suppliers: {
    all: () => ['suppliers'] as const,
    list: (filters: Record<string, unknown>) => ['suppliers', 'list', filters] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
  },
  milkCollections: {
    all: () => ['milk-collections'] as const,
    list: (filters: Record<string, unknown>) => ['milk-collections', 'list', filters] as const,
    todayShift: () => ['milk-collections', 'today-shift'] as const,
  },
  complaints: {
    all: () => ['complaints'] as const,
    list: (filters: Record<string, unknown>) => ['complaints', 'list', filters] as const,
  },
  returns: {
    all: () => ['returns'] as const,
    list: (filters: Record<string, unknown>) => ['returns', 'list', filters] as const,
  },
  holidays: {
    all: () => ['holidays'] as const,
    list: (filters: Record<string, unknown>) => ['holidays', 'list', filters] as const,
  },
  contact: {
    all: () => ['contact'] as const,
    list: (filters: Record<string, unknown>) => ['contact', 'list', filters] as const,
  },
  permissions: {
    all: () => ['permissions'] as const,
    my: () => ['permissions', 'my'] as const,
    user: (userId: string) => ['permissions', 'user', userId] as const,
  },
  transactions: {
    list: (filters: Record<string, unknown>) => ['transactions', 'list', filters] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    deliveryPerformance: () => ['admin', 'delivery-performance'] as const,
    deliveryStats: () => ['admin', 'delivery-stats'] as const,
    profitStats: () => ['admin', 'profit-stats'] as const,
  },
  balances: {
    list: (filters: Record<string, unknown>) => ['balances', 'list', filters] as const,
  },
} as const;
```

### 2.5 API Client Architecture

```typescript
// lib/api-client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError(401, 'Session expired');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.message ?? 'Request failed', data);
  }

  return data;
}

// Typed convenience methods
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) => {
    const url = new URL(path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
      });
    }
    const finalPath = path.startsWith('http') ? url.toString() : url.pathname + url.search;
    return apiClient<T>(finalPath);
  },
  post: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    apiClient<T>(path, { method: 'DELETE' }),
};
```

### 2.6 Authentication & Authorization

**Auth flow (cookie-based JWT — unchanged from backend-v2):**

1. User submits credentials → `POST /api/users/login` → backend sets `token` httpOnly cookie
2. All subsequent requests include cookie automatically (`credentials: 'include'`)
3. On 401 → dispatch `auth:unauthorized` event → AuthProvider clears state → redirect to `/login`
4. Permissions fetched via `GET /api/permissions/my` after login

**Route protection layers:**
- `<AuthGuard>` — Requires any authenticated user (wraps all routes except `/login`)
- `<AdminGuard>` — Requires `role === 'admin'` (wraps admin-only routes)
- `<PermissionGuard permission="delivery_board.view">` — Requires specific permission

**Permission model (from backend-v2):**
- Roles: `admin`, `delivery`, `delivery_partner`, `agent`, `customer`, `supplier`
- Admin has all permissions implicitly
- Delivery roles get permissions assigned via PermissionsPage
- Permissions (10): `profile.view`, `profile.update`, `manifest.view_today`, `manifest.view_history`, `manifest.update`, `delivery_board.view`, `collection.record`, `collection.view_history`, `customer.view_basic`, `area.view`

### 2.7 Routing Structure

```typescript
// routes.tsx
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

      {/* Agent dashboard routes */}
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
```

### 2.8 Form & Validation Strategy

Every form uses **React Hook Form + Zod**:

```typescript
// features/orders/schemas.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().min(1, 'Minimum 1'),
    price: z.number().min(0),
  })).min(1, 'At least one item required'),
  paymentMethod: z.enum(['COD', 'online']),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

**Form component pattern:**

```typescript
// features/orders/components/order-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, type CreateOrderInput } from '../schemas';

export function OrderForm({ onSubmit, defaultValues }: Props) {
  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues,
  });
  // ...
}
```

### 2.9 Error/Loading/Empty State Strategy

| State | Component | Behavior |
|-------|-----------|----------|
| **Page loading** | `<PageSkeleton />` | Tailwind skeleton matching page layout |
| **Data loading** | `<Skeleton />` | Inline skeleton for specific data areas |
| **Full-page loading** | `<LoadingScreen />` | Centered spinner + text (login, initial auth check) |
| **Empty data** | `<EmptyState />` | Icon + message + optional action button |
| **API error** | `<ErrorState />` | Error message + retry button |
| **Unrecoverable** | `<ErrorBoundary />` | Catches React render errors, shows fallback |
| **Mutation error** | Sonner toast | `toast.error(message)` on mutation failures |
| **Mutation success** | Sonner toast | `toast.success(message)` on successful actions |
| **Optimistic update** | TanStack Query `onMutate` | Instant UI update, rollback on failure |

---

## 3. Complete Feature Structure

### 3.1 Feature → Module Mapping

Every existing functionality mapped to its module:

| # | Feature Module | Pages | API Endpoints (backend-v2) |
|---|---------------|-------|---------------------------|
| 1 | `auth` | LoginPage | `POST /api/users/login`, `POST /api/users/logout`, `GET /api/users/profile`, `GET /api/permissions/my` |
| 2 | `dashboard` | DashboardPage | `GET /api/admin/stats`, `GET /api/admin/delivery-performance`, `GET /api/admin/delivery-stats`, `GET /api/admin/profit-stats`, `GET /api/milk-collections/today-shift`, `GET /api/subscriptions/admin/delivery-board`, `GET /api/subscriptions/admin/today-supply` |
| 3 | `deliveries` | DeliveriesPage | `GET /api/subscriptions/admin/delivery-board`, `PUT /api/manifests/:id/entries/:entryId`, `POST /api/subscriptions/admin/:id/delivery-outcome` |
| 4 | `orders` | OrdersPage, OrderDetailPage | `GET /api/orders/admin/all`, `GET /api/orders/admin/:id`, `POST /api/orders/admin/create`, `PUT /api/orders/admin/:id`, `PUT /api/orders/admin/:id/status`, `POST /api/orders/admin/:id/delivery-outcome`, `POST /api/orders/admin/instant-delivery` |
| 5 | `subscriptions` | SubscriptionsPage, SubscriptionDetailPage | `GET /api/subscriptions/admin/all`, `GET /api/subscriptions/admin/:id`, `POST /api/subscriptions/admin/create`, `PUT /api/subscriptions/admin/:id`, `PUT /api/subscriptions/admin/:id/status`, `PUT /api/subscriptions/admin/bulk-pause`, `PUT /api/subscriptions/admin/bulk-resume`, `PUT /api/subscriptions/admin/:id/schedule-change`, `DELETE /api/subscriptions/admin/:id/schedule-change`, `DELETE /api/subscriptions/admin/:id/delivery/:entryId` |
| 6 | `customers` | CustomersPage, CustomerDetailPage | `GET /api/users/admin/all?role=customer`, `GET /api/users/admin/:id`, `POST /api/users/admin/create`, `PUT /api/users/admin/:id`, `GET /api/subscriptions/admin/user/:userId/active` |
| 7 | `products` | ProductsPage | `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` |
| 8 | `invoices` | InvoicesPage, InvoiceDetailPage | `GET /api/invoices/admin`, `GET /api/invoices/admin/:id`, `GET /api/invoices/admin/:id/pdf`, `POST /api/invoices/admin/generate/:userId`, `POST /api/invoices/admin/generate-bulk`, `POST /api/invoices/admin/:id/regenerate`, `PATCH /api/invoices/admin/:id/status`, `POST /api/invoices/admin/:id/send-whatsapp` |
| 9 | `payments` | PaymentsPage (two tabs: customer + supplier) | **Customer:** `GET /api/payments/admin/all`, `POST /api/payments/admin/record`, `DELETE /api/payments/admin/:id` — **Supplier:** `GET /api/supplier-payments`, `POST /api/supplier-payments` |
| 10 | `balances` | BalancesPage | `GET /api/transactions/balances?partyType=customer`, `PUT /api/transactions/:id`, `DELETE /api/transactions/:id`, `POST /api/transactions/:id/void` |
| 11 | `expenses` | ExpensesPage | `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id` |
| 12 | `areas` | AreasPage, AreaCustomersPage | `GET /api/areas`, `POST /api/areas`, `PUT /api/areas/:id`, `DELETE /api/areas/:id`, `GET /api/areas/:id/customers`, `PUT /api/areas/:id/customers` |
| 13 | `agents` | AgentsPage, AgentDetailPage, AgentDashboardPage | `GET /api/agents`, `GET /api/agents/:id`, `POST /api/agents`, `PUT /api/agents/:id`, `PUT /api/users/admin/:id/delivery-config`, `GET /api/areas/agents` |
| 14 | `manifests` | ManifestsPage, ManifestDetailPage, AgentDashboardPage | **Admin:** `GET /api/manifests`, `GET /api/manifests/:id`, `POST /api/manifests/generate`, `PUT /api/manifests/:id/resequence`, `PUT /api/manifests/:id/entries/:entryId` — **Agent:** `GET /api/manifests/my/today`, `GET /api/manifests/my/history` |
| 15 | `suppliers` | SuppliersPage, SupplierDetailPage | `GET /api/suppliers`, `GET /api/suppliers/:id`, `POST /api/suppliers`, `PUT /api/suppliers/:id` |
| 16 | `milk-collections` | MilkCollectionsPage | `GET /api/milk-collections`, `POST /api/milk-collections`, `PUT /api/milk-collections/:id`, `PUT /api/milk-collections/:id/confirm`, `GET /api/milk-collections/today-shift` |
| 17 | `complaints` | ComplaintsPage | `GET /api/complaints`, `POST /api/complaints`, `PUT /api/complaints/:id` |
| 18 | `returns` | ReturnsPage | `GET /api/returns`, `PUT /api/returns/:id/status` |
| 19 | `holidays` | HolidaysPage | `GET /api/holidays`, `POST /api/holidays`, `DELETE /api/holidays/:id` |
| 20 | `contact` | ContactMessagesPage | `GET /api/contact`, `PUT /api/contact/:id/status` |
| 21 | `permissions` | PermissionsPage | `GET /api/permissions`, `GET /api/permissions/my`, `PUT /api/permissions/:userId` |

### 3.2 Screens & Workflows Per Module

#### Auth
- **Login screen:** Email/phone + password → session cookie → redirect to dashboard (admin) or agent dashboard (delivery roles)
- **Session check:** On mount, `GET /api/users/profile` — if 401, redirect to login
- **Logout:** `POST /api/users/logout` → clear local state → redirect to login

#### Dashboard (Admin)
- **Metric cards:** Revenue, today's orders, active subscriptions, pending deliveries, pending COD, total customers
- **Profit panel:** Revenue vs expenses for today and this month, margin bar
- **Operations panel:** Delivery qty vs scheduled, milk collected, progress bars, today/month toggle
- **Load sheet:** Products needed for today's deliveries with qty and amount
- **Shift collection:** Current morning/evening milk collection stats
- **Recent activity:** Last 5 orders, last 5 subscription changes
- **Performance:** Agent and area delivery success rates (last N days)
- **Section navigator:** Quick-link cards to all modules

#### Delivery Board
- **Date/slot selector:** Pick date + morning/evening slot
- **Customer-grouped list:** Deliveries grouped by customer with expand/collapse
- **Delivery card:** Product, qty, scheduled/actual, status badge, outcome button
- **Outcome recording:** Sheet/dialog to record delivered/skipped/partial/extra/failed with actual qty and notes
- **Bulk actions:** "Deliver All" for a customer, "Confirm All" for a route/area
- **Extra products:** Record ad-hoc extras not in the original manifest
- **Filters:** By area, agent, status, product

#### Orders (full CRUD + status workflow)
- **List page:** Paginated table with search (customer name, order ID), filters (status, payment method, date range), sorting
- **Detail page:** Order header, items table, status actions, payment status, delivery outcome
- **Create:** Customer selector, product picker with variants, qty, price, payment method, delivery date
- **Status transitions:** placed → confirmed → delivered → (cancelled from any pre-delivered state)
- **Instant delivery:** Create + immediately deliver in one step

#### Subscriptions (full CRUD + status + history)
- **List page:** Paginated table with search, filters (status, product, schedule type)
- **Detail page:** Subscription config, delivery history timeline, quantity/price/schedule changes
- **Create:** Customer, product, variant, qty, price, schedule (daily/alternate/weekly/custom), slot (morning/evening), start date
- **Status:** active ↔ paused → cancelled
- **Edit:** Change qty, price, schedule, variant, slot — each creates a history entry

#### Customers (full CRUD + tabs)
- **List page:** Paginated table with search (name, phone, email), filters (area, status)
- **Detail page:** Profile info, address, tabbed view (orders, subscriptions, payments, balance/transactions)
- **Create/Edit:** Name, phone, email, address (type, line1, line2, city, pincode), area assignment, delivery preferences

#### Products (full CRUD)
- **Grid/list:** Product cards or table, filter by category
- **Create/Edit:** Name, category, description, price, unit, measurement, variants (size, price), active/inactive toggle

---

## 4. Mobile-First UI/UX Architecture

### 4.1 Design Philosophy

The app is **primarily used on mobile** by delivery agents in the field and by admin on-the-go. Desktop is secondary but must remain functional.

**Breakpoints (Tailwind):**
- `sm` (640px): Small tablets
- `md` (768px): Tablets
- `lg` (1024px): Desktop starts
- `xl` (1280px): Wide desktop

### 4.2 Layout Strategy

```
Mobile (<lg):
┌──────────────────────┐
│ MobileHeader         │  ← Sticky, shows title + actions
├──────────────────────┤
│                      │
│   Page Content       │  ← Full width, scrollable
│                      │
├──────────────────────┤
│ BottomNav            │  ← Fixed bottom, 4-5 items + "More"
└──────────────────────┘

Desktop (≥lg):
┌───────┬──────────────────────┐
│       │ TopBar               │
│ Side  ├──────────────────────┤
│ bar   │                      │
│       │   Page Content       │
│       │                      │
│       │                      │
└───────┴──────────────────────┘
```

### 4.3 Mobile-Friendly Patterns

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| **Tables** | Stack as cards via `<DataList>` | Traditional `<DataTable>` with columns |
| **Forms** | Full-screen sheet (`<Sheet side="bottom">`) | Side drawer or modal (`<Dialog>`) |
| **Filters** | Bottom sheet with filter groups | Inline filter bar above table |
| **Actions** | Sticky bottom action bar | Inline buttons / dropdown menu |
| **Navigation** | Bottom nav (4 items) + drawer for "More" | Sidebar with all items |
| **Detail pages** | Stacked sections, full width | Two-column or card grid |
| **Modals** | Full-screen bottom sheets | Centered dialogs |
| **Confirm dialogs** | Centered dialog (small) | Same |
| **Date pickers** | Native `<input type="date">` (uses OS picker) | Same (simplest, most reliable) |
| **Search** | Expanding search in header | Persistent search input |

### 4.4 Touch Targets

- Minimum touch target: `44px` (matching Apple HIG)
- All interactive elements: `min-h-11` (44px) in Tailwind
- Adequate spacing between tappable items: `gap-2` minimum
- Bottom nav icons: `p-2` padding around icons

### 4.5 Responsive Data Display

The `<DataTable>` and `<DataList>` pattern:

```tsx
// components/data/data-table.tsx
// On ≥md: renders a proper HTML table with column headers
// On <md: auto-switches to DataList (card-based layout)

// Usage in a page:
<DataTable
  data={orders}
  columns={columns}         // Desktop table columns
  renderCard={(order) => (   // Mobile card renderer
    <OrderCard order={order} />
  )}
  loading={isLoading}
  emptyMessage="No orders found"
  pagination={pagination}
  onPageChange={setPage}
/>
```

---

## 5. Design System

### 5.1 Tailwind CSS Architecture

Using **Tailwind CSS v4** with CSS-first configuration. There is **no `tailwind.config.ts`** — Tailwind v4 replaces the JS config file with `@theme` blocks in CSS. No `postcss.config.js` is needed either; the Vite plugin (`@tailwindcss/vite`) handles PostCSS integration automatically.

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Brand Colors */
  --color-primary-50: #ecfdf5;
  --color-primary-100: #d1fae5;
  --color-primary-200: #a7f3d0;
  --color-primary-300: #6ee7b7;
  --color-primary-400: #34d399;
  --color-primary-500: #10b981;   /* Primary */
  --color-primary-600: #059669;
  --color-primary-700: #047857;
  --color-primary-800: #065f46;
  --color-primary-900: #064e3b;

  --color-secondary-50: #fffbeb;
  --color-secondary-100: #fef3c7;
  --color-secondary-400: #fbbf24;
  --color-secondary-500: #f59e0b;  /* Secondary (amber) */
  --color-secondary-600: #d97706;

  --color-accent-50: #ede9fe;
  --color-accent-500: #8b5cf6;    /* Accent (violet) */

  /* Surfaces */
  --color-surface: #ffffff;
  --color-surface-muted: #f1f5f9;
  --color-surface-inset: #f8fafc;

  /* Semantic */
  --color-danger: #ef4444;
  --color-danger-bg: #fef2f2;
  --color-success: #10b981;
  --color-success-bg: #ecfdf5;
  --color-warning: #f59e0b;
  --color-warning-bg: #fffbeb;
  --color-info: #3b82f6;
  --color-info-bg: #eff6ff;

  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 80px;
  --topbar-height: 64px;
  --bottom-nav-height: 64px;
  --mobile-header-height: 56px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-elevated: 0 4px 8px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-overlay: 0 20px 32px -6px rgba(0, 0, 0, 0.10), 0 8px 16px -6px rgba(0, 0, 0, 0.04);

  /* Animations */
  --animate-slide-up: slide-up 0.3s cubic-bezier(0, 0, 0.2, 1);
  --animate-fade-in: fade-in 0.2s ease-out;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### 5.2 Component Design System

All UI primitives follow consistent patterns:

#### Button Variants
```tsx
<Button variant="default" />   // Primary green, filled
<Button variant="secondary" /> // Gray, filled
<Button variant="outline" />   // Border only
<Button variant="ghost" />     // No background, hover highlight
<Button variant="destructive" /> // Red, for delete actions
<Button variant="link" />      // Looks like a link

<Button size="sm" />           // h-8, text-sm
<Button size="default" />      // h-10, text-sm
<Button size="lg" />           // h-11, text-base
<Button size="icon" />         // h-10, w-10, icon only
```

#### Status Badge
```tsx
<StatusBadge status="active" />      // Green
<StatusBadge status="delivered" />   // Green
<StatusBadge status="paused" />      // Amber
<StatusBadge status="pending" />     // Amber
<StatusBadge status="cancelled" />   // Red
<StatusBadge status="failed" />      // Red
<StatusBadge status="draft" />       // Gray
```

Status → color mapping centralized in one place.

#### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

#### Dialog (Modal)
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Sheet (Drawer / Bottom Sheet)
```tsx
// Mobile: slides up from bottom
// Desktop: slides in from right
<Sheet>
  <SheetContent side="bottom" className="lg:side-right">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
    </SheetHeader>
    {/* Filter form */}
  </SheetContent>
</Sheet>
```

### 5.3 Typography Scale

Using Tailwind's default scale:
- Page titles: `text-xl font-semibold lg:text-2xl`
- Section headings: `text-lg font-semibold`
- Card titles: `text-base font-medium`
- Body text: `text-sm text-slate-700`
- Muted text: `text-xs text-slate-500`
- Table headers: `text-xs font-medium uppercase tracking-wide text-slate-500`

### 5.4 Spacing & Sizing

- Page padding: `p-4 lg:p-6 xl:p-8`
- Card padding: `p-4 lg:p-5`
- Form field gap: `space-y-4`
- Card grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Metric cards: `grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`

---

## 6. Backend-v2 Integration

### 6.1 API Route Map

Complete mapping of frontend modules to backend-v2 API routes:

#### Auth (`/api/users`)
```
POST   /api/users/login                       # Login → sets httpOnly token cookie
POST   /api/users/logout                      # Logout → clears cookie
POST   /api/users/refresh                     # Refresh JWT
GET    /api/users/profile                     # Get current user profile
PUT    /api/users/profile                     # Update own profile
```

#### Users/Customers (`/api/users`)
```
GET    /api/users/admin/all?page&limit&search&role    # List users; filter role=customer for customers
POST   /api/users/admin/create                        # Create user (any role)
GET    /api/users/admin/:id                           # Get user detail
PUT    /api/users/admin/:id                           # Update user
PUT    /api/users/admin/:id/delivery-config           # Set delivery config (slot, address, etc.)
```

#### Orders (`/api/orders`)
```
GET    /api/orders/admin/all?page&limit&search&status&paymentMethod&from&to&sortBy&sortOrder
POST   /api/orders/admin/create
POST   /api/orders/admin/instant-delivery
GET    /api/orders/admin/:id
PUT    /api/orders/admin/:id
PUT    /api/orders/admin/:id/status            # { status }
POST   /api/orders/admin/:id/delivery-outcome  # { outcome, actualQuantity, notes }
```

#### Subscriptions (`/api/subscriptions`)
```
# Admin routes (static paths declared before /:id)
POST   /api/subscriptions/admin/create
GET    /api/subscriptions/admin/all?page&limit&search&status&productId
GET    /api/subscriptions/admin/today-supply?date&slot
GET    /api/subscriptions/admin/delivery-board?date&slot  # deliveryOrAdmin
GET    /api/subscriptions/admin/user/:userId/active       # Active subs for a customer
PUT    /api/subscriptions/admin/bulk-pause                 # { ids: string[] }
PUT    /api/subscriptions/admin/bulk-resume                # { ids: string[] }
PUT    /api/subscriptions/admin/:id
PUT    /api/subscriptions/admin/:id/status                 # { status }
PUT    /api/subscriptions/admin/:id/schedule-change        # Schedule future change
DELETE /api/subscriptions/admin/:id/schedule-change        # Cancel pending change
POST   /api/subscriptions/admin/:id/delivery-outcome       # deliveryOrAdmin; idempotency
DELETE /api/subscriptions/admin/:id/delivery/:entryId      # Delete delivery history entry
```

#### Products (`/api/products`)
```
GET    /api/products?page&limit&search&category
POST   /api/products                           # adminOnly
GET    /api/products/:id
PUT    /api/products/:id                       # adminOnly
DELETE /api/products/:id                       # adminOnly
```

#### Invoices (`/api/invoices`)
```
# Admin routes (statics before /:id)
GET    /api/invoices/admin?page&limit&status&customerId&from&to
POST   /api/invoices/admin/generate-bulk       # Bulk generate invoices for all customers
POST   /api/invoices/admin/generate/:userId    # Generate invoice for one customer { from, to }
GET    /api/invoices/admin/:id
GET    /api/invoices/admin/:id/pdf?download=true  # PDF download/view
POST   /api/invoices/admin/:id/regenerate      # Re-generate (recalculate line items)
PATCH  /api/invoices/admin/:id/status          # { status } — draft→sent→paid
POST   /api/invoices/admin/:id/send-whatsapp   # Send PDF link via WhatsApp

# Customer routes
GET    /api/invoices/my?page&limit
GET    /api/invoices/my/:id
GET    /api/invoices/my/:id/pdf
```

#### Payments (`/api/payments`)
```
GET    /api/payments/my-passbook?page&limit&from&to         # Customer's own payment history
GET    /api/payments/:userId?page&limit&from&to             # Admin: customer passbook by userId
POST   /api/payments/admin/record                           # adminOrDeliveryPartner; idempotency
PUT    /api/payments/admin/:id                              # adminOnly; idempotency
DELETE /api/payments/admin/:id                              # adminOnly; body: { reason }
```

#### Supplier Payments (`/api/supplier-payments`)
```
# All adminOnly
GET    /api/supplier-payments/outstanding                   # Outstanding amounts per supplier
GET    /api/supplier-payments/collection-total              # Total collection amounts
POST   /api/supplier-payments                               # Record a supplier payment
GET    /api/supplier-payments/:supplierId?page&limit&from&to # Payment history for one supplier
```

#### Expenses (`/api/expenses`)
```
GET    /api/expenses?page&limit&category&from&to
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id
```

#### Areas (`/api/areas`)
```
GET    /api/areas                              # deliveryOrAdmin
POST   /api/areas                             # adminOnly
GET    /api/areas/agents                       # List agents with their area assignments; adminOnly
GET    /api/areas/:id                          # deliveryOrAdmin
PUT    /api/areas/:id                          # adminOnly
DELETE /api/areas/:id                          # adminOnly
GET    /api/areas/:id/customers                # List customers with sequence; adminOnly
PUT    /api/areas/:id/customers                # Assign/reorder customers { customerIds: string[] }
```

#### Agents (`/api/agents`)
```
GET    /api/agents
GET    /api/agents/:id
POST   /api/agents
PUT    /api/agents/:id
```

#### Manifests (`/api/manifests`)
```
# Admin routes (statics before /:id)
POST   /api/manifests/generate                 # Generate manifests for date+slot
GET    /api/manifests?page&limit&date&slot&agentId&status
GET    /api/manifests/my/today                 # Agent's today manifest; deliveryOrAdmin
GET    /api/manifests/my/history?page&limit    # Agent's manifest history; deliveryOrAdmin
GET    /api/manifests/:id                      # deliveryOrAdmin (agents see their own only)
PUT    /api/manifests/:id/resequence           # Reorder entries { entryIds: string[] }; adminOnly
PUT    /api/manifests/:id/entries/:entryId     # Update entry outcome; deliveryOrAdmin
```

#### Suppliers (`/api/suppliers`)
```
GET    /api/suppliers
GET    /api/suppliers/:id
POST   /api/suppliers
PUT    /api/suppliers/:id
```

#### Milk Collections (`/api/milk-collections`)
```
GET    /api/milk-collections?page&limit&date&session&supplierId
POST   /api/milk-collections
PUT    /api/milk-collections/:id
PUT    /api/milk-collections/:id/confirm
GET    /api/milk-collections/today-shift
```

#### Complaints (`/api/complaints`)
```
GET    /api/complaints?page&limit&status&category
POST   /api/complaints
PUT    /api/complaints/:id
```

#### Returns (`/api/returns`)
```
GET    /api/returns?page&limit&status
PUT    /api/returns/:id/status
```

#### Holidays (`/api/holidays`)
```
GET    /api/holidays?from&to
POST   /api/holidays
DELETE /api/holidays/:id
```

#### Contact (`/api/contact`)
```
GET    /api/contact?page&limit&status
PUT    /api/contact/:id/status
```

#### Permissions (`/api/permissions`)
```
GET    /api/permissions                         # List all permission assignments; adminOnly
GET    /api/permissions/my                      # Current user's permissions
PUT    /api/permissions/:userId                 # Set permissions for user; adminOnly
```

#### Transactions (`/api/transactions`)
```
# All adminOnly
PUT    /api/transactions/:id                    # Edit transaction amount/notes
DELETE /api/transactions/:id                    # Delete transaction
POST   /api/transactions/:id/void               # Void transaction (soft-delete with reversal)
GET    /api/transactions/balances?partyType=customer   # Outstanding balance summary
```

#### Admin Analytics (`/api/admin`)
```
GET    /api/admin/stats                         # High-level counts (orders, customers, revenue)
GET    /api/admin/delivery-performance          # Agent/area delivery success rates
GET    /api/admin/delivery-stats                # Delivery qty summary by date/slot
GET    /api/admin/profit-stats                  # Revenue vs expense comparison (today/month)
```

> **Note:** Bulk pause/resume subscriptions is at `PUT /api/subscriptions/admin/bulk-pause` and `PUT /api/subscriptions/admin/bulk-resume` — not under `/api/admin/`.

#### Real-Time (`/api/sse`)
```
GET    /api/sse                                 # Server-Sent Events stream; auth required
```

#### UPI (`/api/upi`)
```
GET    /api/upi/qr/:invoiceId                   # Generate UPI QR code data for invoice payment
```

### 6.2 Response Format

Backend-v2 uses consistent response shapes:

```typescript
// Success
{ success: true, data: T }

// Success with pagination
{ success: true, data: T[], meta: { total, page, limit, totalPages } }

// Created
{ success: true, data: T }  // 201

// Error
{ success: false, message: string }
```

### 6.3 Pagination Pattern

```typescript
// Feature API function pattern:
export async function listOrders(params: OrderListParams) {
  return api.get<PaginatedResponse<Order>>('/api/orders/admin/all', {
    page: params.page,
    limit: params.limit,
    search: params.search,
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}

// Feature hook pattern:
export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => listOrders(params),
    placeholderData: keepPreviousData,  // Keep showing old data while refetching
  });
}
```

### 6.4 Mutation Pattern

```typescript
// Feature hook for mutations:
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.put(`/api/orders/admin/${id}/status`, { status }),
    onSuccess: (_, { id }) => {
      // Invalidate the specific order and the list
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success('Order status updated');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

### 6.5 Authentication Handling

The TanStack Query client configuration is in Section 11.2 (Production Readiness). The key auth-related behavior:

- **401 handling:** The `apiClient` in `lib/api-client.ts` dispatches `auth:unauthorized` on 401 → `AuthProvider` listens, clears user state, redirects to `/login`
- **No retry on 401/403/404:** Query client skips retry for these status codes
- **Token refresh:** On 401, attempt silent refresh via `POST /api/users/refresh` before redirecting to login

### 6.6 Integration Notes

1. **No dedicated customer endpoint** — Customers are users with `role: 'customer'`. Always pass `?role=customer` when calling `GET /api/users/admin/all` from customer-facing features.
2. **SSE for real-time delivery board** — `backend-v2` exposes `GET /api/sse`. The redesign should connect to this on the DeliveriesPage and AgentDashboardPage to receive live manifest entry updates without polling. Use the browser's native `EventSource` API (no extra library needed). Reconnect with exponential backoff on disconnect.
3. **WhatsApp invoice delivery** — `POST /api/invoices/admin/:id/send-whatsapp` triggers the backend's `whatsappService` to send the invoice PDF link. The InvoiceDetailPage should expose this as a "Send via WhatsApp" button. No additional client-side integration needed.
4. **UPI QR in invoice detail** — `GET /api/upi/qr/:invoiceId` returns QR code data. Render with `qrcode.react` in the InvoiceDetailPage so customers can scan to pay. This is the primary payment mechanism for invoices.
5. **Multi-tenancy** — `backend-v2` derives tenant context from the JWT via `tenant` middleware. The frontend does not need to send a tenant header; it's handled transparently.
6. **Transaction balance endpoint** — `GET /api/transactions/balances?partyType=customer` returns aggregated customer balances. Use this for the BalancesPage. Admin can also edit (`PUT`), delete (`DELETE`), or void (`POST /:id/void`) transactions directly.
7. **Supplier payments location** — Supplier payments (`/api/supplier-payments`) are separate from customer payments (`/api/payments`). Both appear on `PaymentsPage` under separate tabs. Supplier detail page also shows payment history filtered by `supplierId`.
8. **Idempotency** — The backend uses an idempotency middleware on subscription create and delivery-outcome POST routes. The frontend does not need to generate idempotency keys explicitly — the middleware reads from an `Idempotency-Key` request header if present. For safety with form double-submissions, consider adding a UUID header on these POST calls.
9. **Delivery board access** — `GET /api/subscriptions/admin/delivery-board` is accessible by `deliveryOrAdmin`. Delivery agents can reach this endpoint (used on their dashboard and the shared DeliveriesPage).

---

## 7. Recommended Implementation Structure

### 7.1 Detailed Route Structure

```
/login                          → LoginPage
/                               → DashboardPage (admin)
/orders                         → OrdersPage
/orders/:id                     → OrderDetailPage
/subscriptions                  → SubscriptionsPage
/subscriptions/:id              → SubscriptionDetailPage
/customers                      → CustomersPage
/customers/:id                  → CustomerDetailPage
/products                       → ProductsPage
/payments                       → PaymentsPage
/expenses                       → ExpensesPage
/invoices                       → InvoicesPage
/invoices/:id                   → InvoiceDetailPage
/balances                       → BalancesPage
/areas                          → AreasPage
/areas/:id/customers            → AreaCustomersPage
/agents                         → AgentsPage
/agents/:id                     → AgentDetailPage
/manifests                      → ManifestsPage
/manifests/:id                  → ManifestDetailPage
/suppliers                      → SuppliersPage
/suppliers/:id                  → SupplierDetailPage
/milk-collections               → MilkCollectionsPage
/complaints                     → ComplaintsPage
/returns                        → ReturnsPage
/holidays                       → HolidaysPage
/messages                       → ContactMessagesPage
/permissions                    → PermissionsPage
/deliveries                     → DeliveriesPage (permission-gated)
/agent                          → AgentDashboardPage (permission-gated)
/agent/manifest/:id             → ManifestDetailPage (permission-gated)
/agent/collections              → MilkCollectionsPage (permission-gated)
/agent/history                  → ManifestsPage (permission-gated, agent's own history)
/agent/profile                  → AgentProfilePage (permission-gated)
```

### 7.2 File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `kebab-case-page.tsx` | `orders-page.tsx` |
| Components | `kebab-case.tsx` | `order-form.tsx` |
| Hooks | `use-kebab-case.ts` | `use-orders.ts` (in hooks.ts barrel) |
| Types | `kebab-case.ts` | `order.ts` |
| Schemas | `schemas.ts` | Per feature |
| API functions | `api.ts` | Per feature |
| Utilities | `kebab-case.ts` | `date-utils.ts` |
| Constants | `constants.ts` | Enum arrays, nav items |

### 7.3 Module Boundaries

**Rules:**
1. Features **never** import from other features directly. Cross-feature data is accessed via shared hooks or types.
2. `lib/` is framework-level — no business logic.
3. `types/` mirrors backend-v2 schemas — shared across features.
4. `components/` are purely presentational — no API calls, no business logic.
5. Feature `hooks.ts` is the public API — pages import hooks, not raw API functions.

**Dependency flow:**
```
pages → feature hooks → feature api → lib/api-client
pages → shared components
feature hooks → lib/query-keys
feature schemas → types/
```

### 7.4 Development Patterns

**Feature API file pattern:**
```typescript
// features/orders/api.ts
import { api } from '@/lib/api-client';
import type { Order, PaginatedResponse, OrderListParams, CreateOrderInput } from '@/types';

export const ordersApi = {
  list: (params: OrderListParams) =>
    api.get<PaginatedResponse<Order>>('/api/orders/admin/all', params),
  
  get: (id: string) =>
    api.get<{ success: true; data: Order }>(`/api/orders/admin/${id}`),
  
  create: (data: CreateOrderInput) =>
    api.post<{ success: true; data: Order }>('/api/orders/admin/create', data),
  
  update: (id: string, data: Partial<CreateOrderInput>) =>
    api.put<{ success: true; data: Order }>(`/api/orders/admin/${id}`, data),
  
  updateStatus: (id: string, status: string) =>
    api.put(`/api/orders/admin/${id}/status`, { status }),
};
```

**Feature hooks file pattern:**
```typescript
// features/orders/hooks.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ordersApi } from './api';
import { toast } from 'sonner';

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success('Order created');
    },
    onError: (err) => toast.error(err.message),
  });
}
```

**Page file pattern:**
```typescript
// features/orders/orders-page.tsx
import { useSearchParams } from 'react-router-dom';
import { useOrders } from './hooks';
import { OrderTable } from './components/order-table';
// ... minimal page shell that wires hooks to components
```

---

## 8. Migration/Rebuild Strategy

### 8.1 Implementation Phases

#### Phase 0 — Project Scaffolding (Day 1)
- Initialize Vite + React + TypeScript project (`npm create vite@latest`)
- Install and configure Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.ts`, no `postcss.config.js`)
- Configure ESLint, TypeScript strict mode, path aliases (`@/` → `src/`)
- Set up TanStack Query provider, Sonner
- Add `public/_redirects` for Cloudflare Pages SPA routing
- Create `lib/api-client.ts`, `lib/query-client.ts`, `lib/query-keys.ts`
- Create `lib/utils.ts` with `cn()`, `formatCurrency()`, `formatDate()`, `formatTime()`
- Create global styles

#### Phase 1 — Design System & Layout (Days 2-3)
- Build all `components/ui/` primitives (Button, Input, Card, Badge, Dialog, Sheet, etc.)
- Build `components/data/` (DataTable, DataList, Pagination, SearchInput, FilterBar, StatusBadge, EmptyState, ErrorState)
- Build `components/layout/` (AppShell, Sidebar, TopBar, BottomNav, MobileHeader, MobileDrawer, PageHeader, Breadcrumbs)
- Build `components/form/` (FormField, FormSelect, FormDate)
- Build `components/feedback/` (ConfirmDialog, LoadingScreen, PageSkeleton, ErrorBoundary)

#### Phase 2 — Auth & Core Infrastructure (Day 4)
- Create all `types/` files mirroring backend-v2 schemas
- Build `features/auth/` (login page, AuthProvider, AuthGuard, AdminGuard, PermissionGuard)
- Set up `routes.tsx` with all route definitions
- Verify login → dashboard flow works end-to-end

#### Phase 3 — Core Operations Modules (Days 5-8)
Build in order of dependency:
1. **Products** — No dependencies. Simple CRUD. Good first feature to validate patterns.
2. **Areas** — No dependencies. Simple CRUD.
3. **Customers** — Depends on areas (for area assignment).
4. **Orders** — Depends on customers, products.
5. **Subscriptions** — Depends on customers, products. Complex (schedule, history).
6. **Deliveries** — Depends on subscriptions, manifests. Most complex UI (real-time board).

#### Phase 4 — Financial Modules (Days 9-10)
1. **Payments** — Depends on customers.
2. **Invoices** — Depends on customers, orders, subscriptions.
3. **Balances** — Depends on transactions API.
4. **Expenses** — Independent.

#### Phase 5 — Operations & Team (Days 11-12)
1. **Agents** — Depends on areas.
2. **Manifests** — Depends on agents, subscriptions, orders.
3. **Agent Dashboard** — Depends on manifests.
4. **Suppliers** — Independent.
5. **Milk Collections** — Depends on suppliers.
6. **Supplier Payments** — Depends on suppliers.

#### Phase 6 — Support & Admin (Days 13-14)
1. **Complaints** — Independent.
2. **Returns** — Independent.
3. **Holidays** — Independent.
4. **Contact Messages** — Independent.
5. **Permissions** — Depends on agents/users.

#### Phase 7 — Dashboard (Day 15)
- Build last because it aggregates data from all other modules.
- Uses queries from orders, subscriptions, deliveries, milk collections, admin analytics.
- All underlying feature hooks must be working first.

#### Phase 8 — Polish & QA (Days 16-17)
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile responsiveness verification
- Accessibility audit (keyboard navigation, screen reader)
- Performance optimization (bundle analysis, lazy loading verification)
- Error handling edge cases
- Final parity check against v1 functionality

### 8.2 Dependency Graph

```
Phase 0: Scaffolding
  └→ Phase 1: Design System
      └→ Phase 2: Auth
          └→ Phase 3: Core (Products → Areas → Customers → Orders → Subscriptions → Deliveries)
              ├→ Phase 4: Financial (Payments, Invoices, Balances, Expenses)
              ├→ Phase 5: Operations (Agents, Manifests, Suppliers, Milk Collections)
              └→ Phase 6: Support (Complaints, Returns, Holidays, Contact, Permissions)
                  └→ Phase 7: Dashboard (aggregates from all)
                      └→ Phase 8: Polish
```

### 8.3 Parity Verification

For each feature module, verify:
- [ ] All list/table views render with correct columns and data
- [ ] Search works and highlights correct fields
- [ ] All filter options function correctly
- [ ] Pagination works with correct page/limit/total
- [ ] Create form validates and submits correctly
- [ ] Edit form pre-populates and updates correctly
- [ ] Delete/status actions work with confirmation
- [ ] Empty states show correctly
- [ ] Loading states show correctly
- [ ] Error states show and allow retry
- [ ] Mobile layout is usable
- [ ] Desktop layout matches design intent
- [ ] All toast notifications fire correctly
- [ ] Permission gating works (admin vs agent views)

---

## 9. Quality Standards

### 9.1 TypeScript Standards

- **Strict mode:** `"strict": true` in tsconfig
- **No `any`:** Use `unknown` + type guards instead
- **Explicit return types** on API functions and hooks
- **Zod schemas** as single source of truth for form types — use `z.infer<typeof schema>` for TypeScript types
- **Backend response types** defined in `types/` — shared across features
- **Discriminated unions** for status types (e.g., `OrderStatus = 'placed' | 'confirmed' | 'delivered' | 'cancelled'`)

### 9.2 Component Design Principles

1. **Composition over configuration** — Use children and render props, not massive prop interfaces
2. **Headless + styled** — Radix for behavior, Tailwind for appearance
3. **No inline styles** — All styling via Tailwind utility classes
4. **No business logic in components** — Components receive data and callbacks, nothing else
5. **Consistent API** — All components follow the same prop naming conventions (`className`, `children`, `asChild`)

### 9.3 Performance Optimization

- **Code splitting:** Every page is lazy-loaded via `React.lazy()` + `Suspense`
- **Query deduplication:** TanStack Query prevents duplicate requests automatically
- **Stale-while-revalidate:** Show cached data immediately, refetch in background
- **`keepPreviousData`:** Paginated lists don't flash empty during page changes
- **Image optimization:** Use `loading="lazy"` on images
- **Bundle analysis:** Use `rollup-plugin-visualizer` to track bundle size
- **Tree-shaking:** Import from specific paths (`lucide-react` icons, `date-fns` functions)

### 9.4 Accessibility

- All interactive elements are keyboard-navigable (Radix handles this)
- Focus management in dialogs and sheets (Radix handles this)
- ARIA labels on icon-only buttons
- Color contrast meets WCAG AA (the chosen palette passes)
- Skip-to-content link
- Screen reader announcements for toast notifications (Sonner handles this)

### 9.5 Security

- **No sensitive data in URL params** — IDs are fine, but never tokens or passwords
- **Cookie-based auth** — httpOnly, secure, sameSite — handled by backend
- **CSRF protection** — Credentials-mode fetch + `Content-Type: application/json` (non-simple request triggers preflight). Backend CORS whitelist restricts origins.
- **No `dangerouslySetInnerHTML`** — All content rendered via React's safe rendering
- **Input sanitization** — Zod schemas validate all form inputs before submission
- **No eval or dynamic code execution**

### 9.6 Testing Strategy

- **Unit tests:** Vitest for utility functions (`formatCurrency`, `formatDate`, Zod schemas)
- **Component tests:** Vitest + Testing Library for UI components
- **Integration tests:** MSW (Mock Service Worker) for API mocking in component tests
- **E2E tests:** Playwright for critical flows (login, create order, delivery outcome) — optional/future

### 9.7 Error Handling & Observability

- **API errors** → `ApiError` class with status code and message
- **Query errors** → Displayed via `<ErrorState>` with retry button
- **Mutation errors** → Toast notification with error message
- **Render errors** → `<ErrorBoundary>` catches and displays fallback
- **Console logging** → Errors logged in development, consider Sentry for production
- **Network errors** → Handled by fetch wrapper, shown as toast

---

## 10. Cloudflare Pages Deployment

### 10.1 Overview

The frontend is deployed as a **static SPA on Cloudflare Pages**. The backend runs separately (Cloudflare Workers or a VPS). Cloudflare Pages serves the Vite build output (`dist/`) from its global CDN with zero cold-start latency.

### 10.2 Build Configuration

**`wrangler.toml`** (at project root):
```toml
name = "farmilky-management-v2"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"

[env.production]
name = "farmilky-management-v2"

[env.preview]
name = "farmilky-management-v2-preview"
```

**`vite.config.ts`** build settings:
```typescript
export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,           // No source maps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-sheet', /* other Radix */],
        },
      },
    },
  },
});
```

### 10.3 SPA Routing Fix

Cloudflare Pages needs a `_redirects` file so that direct URL access (e.g. `/orders/123`) serves `index.html` instead of a 404:

**`public/_redirects`:**
```
/*    /index.html   200
```

This is the only routing rule needed. All client-side routing is handled by React Router.

### 10.4 Environment Variables

Cloudflare Pages environment variables are set in the Pages dashboard (Settings → Environment Variables):

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://api.farmilky.com` | Backend-v2 base URL |

All `VITE_` prefixed variables are inlined at build time by Vite. Never put secrets in `VITE_` variables — they're visible in the bundle.

**`.env.example`** (committed to repo):
```
VITE_API_BASE_URL=http://localhost:4000
```

**`.env.local`** (gitignored, for local dev):
```
VITE_API_BASE_URL=http://localhost:4000
```

### 10.5 CORS Configuration

The backend-v2 must allow the Cloudflare Pages domain. In `backend-v2/src/app.ts`:

```typescript
app.use(cors({
  origin: [
    'https://farmilky-management-v2.pages.dev',
    'https://admin.farmilky.com',          // Custom domain
    'http://localhost:5173',               // Local dev
  ],
  credentials: true,                      // Required for cookie auth
}));
```

### 10.6 Custom Domain

1. In Cloudflare Pages dashboard → Custom Domains → Add `admin.farmilky.com`
2. Cloudflare automatically provisions an SSL certificate
3. Set CNAME `admin.farmilky.com → farmilky-management-v2.pages.dev` in DNS

### 10.7 Deployment Workflow

```bash
# Manual deploy
npx wrangler pages deploy dist --project-name farmilky-management-v2

# Or via Cloudflare Pages GitHub integration (recommended):
# Connect repo → set build command: npm run build → output dir: dist
```

**Branch deployment strategy:**
- `main` → production (`admin.farmilky.com`)
- `dev` → preview (`*.pages.dev` URL)
- Pull requests → automatic preview URLs

---

## 11. Production Readiness (50+ Users)

### 11.1 Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 90 |
| First Contentful Paint | < 1.5s on 4G |
| Time to Interactive | < 3s on 4G |
| JS bundle (initial) | < 200 KB gzip |
| API response time (p95) | < 500ms |

### 11.2 Frontend Performance

**Code splitting — every page is lazy-loaded:**
```typescript
// routes.tsx
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page'));
const OrdersPage = lazy(() => import('@/features/orders/orders-page'));
// ... all 21+ pages

<Suspense fallback={<PageSkeleton />}>
  <Routes>...</Routes>
</Suspense>
```

**Expected bundle breakdown (gzip):**
- Initial chunk (React + Router + Query): ~50 KB
- Per-page chunks: 5–20 KB each
- Radix UI (shared): ~30 KB
- Total first-load: ~130–160 KB

**TanStack Query tuning for 50+ concurrent users:**
```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — show cached data, no refetch if fresh
      gcTime: 10 * 60_000,        // 10min — keep unused data in cache
      refetchOnWindowFocus: true,  // Refetch when user returns to tab
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
    },
  },
});
```

**Background refetch strategy:**
- Lists (orders, subscriptions): `staleTime: 30_000` — acceptable lag
- Delivery board: `staleTime: 10_000` + SSE for live updates — near real-time
- Dashboard stats: `staleTime: 60_000` — data is already aggregated
- Products, areas, agents: `staleTime: 5 * 60_000` — rarely change

### 11.3 API Performance

**Backend-v2 handles 50+ concurrent users through:**
- Hono's lightweight request handling (no Express overhead)
- PostgreSQL connection pooling (Drizzle uses `pg` pool — configure `max: 20` connections)
- Redis/in-memory cache on aggregate queries (`/api/admin/stats`, `/api/admin/profit-stats`)
- Rate limiting already in place in backend-v2

**Frontend does not over-fetch:**
- TanStack Query deduplicates simultaneous identical requests
- `keepPreviousData` prevents re-fetching on pagination
- Filters are URL-param driven — only changed params trigger new queries

### 11.4 Cloudflare CDN Benefits

- Static assets (`JS`, `CSS`, images) served from 300+ edge PoPs — sub-50ms globally
- `Cache-Control: public, max-age=31536000, immutable` on Vite-hashed assets (automatic)
- HTML (`index.html`): `Cache-Control: no-cache` — always fresh from CDN edge, but revalidates with origin only when changed

### 11.5 Monitoring & Error Tracking

**Sentry (recommended for production):**
```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,          // 10% of transactions
  enabled: import.meta.env.PROD,
});
```

**What to monitor:**
- JS exceptions (Sentry): Unhandled errors, network failures
- API error rates (backend logs / Cloudflare Analytics)
- Query cache hit rate (TanStack Query Devtools in dev)
- Bundle size regressions (CI: `rollup-plugin-visualizer` size check)

### 11.6 Session & Security Hardening

- **httpOnly cookie** — Token never accessible via JS. Backend sets `Secure; SameSite=Lax` (or `SameSite=None; Secure` if frontend and backend are on different registrable domains).
- **Short-lived JWT** — Backend-v2 issues short tokens with refresh via `/api/users/refresh`. Frontend handles 401 → silent refresh → retry, or redirect to login.
- **CSP header** — Add via Cloudflare Pages `_headers` file:

**`public/_headers`:**
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=()
```

- **No sensitive data in localStorage** — Auth state lives in React Context (in-memory). Only non-sensitive UI preferences (e.g., sidebar collapse state) may be persisted to localStorage.

### 11.7 Real-Time with SSE

For the **Delivery Board** and **Agent Dashboard**, connect to the SSE endpoint to receive live manifest entry updates:

```typescript
// features/deliveries/hooks.ts
export function useDeliveryBoardSSE(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource(`${API_BASE}/api/sse`, { withCredentials: true });

    es.addEventListener('manifest:entry_updated', (e) => {
      const payload = JSON.parse(e.data);
      // Invalidate the specific delivery board query to trigger a background refetch
      // Fuzzy match: invalidates all delivery-board queries regardless of date/slot args
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
    });

    es.addEventListener('error', () => {
      // EventSource auto-reconnects; no manual retry needed
    });

    return () => es.close();
  }, [enabled, queryClient]);
}
```

This replaces polling. The SSE stream is a persistent HTTP connection — Cloudflare Pages proxies it transparently if the frontend and backend share a domain (not applicable here — they're separate origins, so SSE goes directly to the backend API URL).

---

## 12. References

### 12.1 Current Codebase References

| Current File | Purpose | Replacement |
|-------------|---------|-------------|
| `src/api/client.js` | Fetch wrapper | `lib/api-client.ts` |
| `src/context/AuthContext.jsx` | Auth state | `features/auth/auth-provider.tsx` |
| `src/context/PortalDataContext.jsx` | Dashboard data | Replaced by per-feature TanStack Query hooks |
| `src/hooks/useApiData.js` | Generic fetch + cache | Replaced by TanStack Query |
| `src/hooks/usePaginatedFetch.js` | Paginated list | Replaced by TanStack Query + URL search params |
| `src/hooks/useAction.js` | Mutation wrapper | Replaced by `useMutation` from TanStack Query |
| `src/hooks/usePermission.js` | Permission check | `hooks/use-permission.ts` |
| `src/components/ui/DataTable.jsx` | Table | `components/data/data-table.tsx` (with responsive card fallback) |
| `src/components/ui/Modal.jsx` | Modal | `components/ui/dialog.tsx` (Radix Dialog) |
| `src/components/ui/BottomSheet.jsx` | Bottom sheet | `components/ui/sheet.tsx` (Radix Dialog variant) |
| `src/components/ui/FilterSheet.jsx` | Filter panel | `components/data/filter-bar.tsx` + `sheet.tsx` |
| `src/components/ui/StatusTag.jsx` | Status rendering | `components/data/status-badge.tsx` |
| `src/components/ui/ConfirmDialog.jsx` | Confirm dialog | `components/feedback/confirm-dialog.tsx` |
| `src/components/layout/Sidebar.jsx` | Desktop nav | `components/layout/sidebar.tsx` |
| `src/components/layout/BottomNav.jsx` | Mobile nav | `components/layout/bottom-nav.tsx` |
| `src/styles/variables.css` | Design tokens | `@theme` block in Tailwind CSS |
| `src/styles/pages/*.css` | Per-page styles | Eliminated — all styling via Tailwind classes |
| `src/utils/constants.js` | Nav items, enums | Split into feature constants + `lib/navigation.ts` |
| `src/utils/format.js` | Formatters | `lib/utils.ts` |

### 12.2 Backend-v2 Architecture Reference

```
backend-v2/src/
├── app.ts                        # Hono app with all route mounting
├── server.ts                     # Node.js HTTP server
├── index.ts                      # Entry point
├── modules/                      # Feature modules (controller → service → repository)
│   ├── {feature}/
│   │   ├── {feature}.routes.ts   # Route definitions with middleware
│   │   ├── {feature}.controller.ts # Request handling
│   │   ├── {feature}.service.ts  # Business logic
│   │   ├── {feature}.repository.ts # Database queries
│   │   └── {feature}.schema.ts   # Zod validation schemas
│   └── ...
└── shared/
    ├── middleware/                # auth, adminOnly, deliveryOrAdmin, tenant, validate, rateLimiter, errorHandler
    ├── db/schema/                # Drizzle ORM table definitions + pgEnum values
    ├── constants/permissions.ts  # Permission keys and role defaults
    ├── types/index.ts            # AuthUser, HonoEnv, PaginationMeta
    ├── utils/                    # response helpers, pagination, date utils, logger
    ├── cache/                    # Redis/memory cache adapter
    ├── jobs/                     # Job queue (BullMQ/pg adapter)
    └── services/                 # Shared services (invoice, PDF, WhatsApp)
```

**Key architectural notes:**
- Backend uses **Hono** (not Express) — lightweight, edge-compatible
- Database: **PostgreSQL** via **Drizzle ORM** (not MongoDB — the frontend currently references `_id` which is a MongoDB pattern; backend-v2 uses `id`)
- Validation: **Zod** on all route inputs
- Auth: JWT in httpOnly cookie, decoded by `auth` middleware
- Multi-tenant: `tenant` middleware injects tenant context from JWT
- Response format: `{ success: true, data }` or `{ success: true, data, meta }` for paginated

### 12.3 ID Field Migration Note

**Critical:** The current frontend references MongoDB-style `_id` fields (e.g., `order._id`, `order.userId._id`). Backend-v2 uses PostgreSQL with standard `id` fields. All ID references must use `id` in the redesign. Populated relations (e.g., `order.user`) return objects with `id`, not `_id`.

---

## Summary

This document provides a complete, implementation-ready blueprint for rebuilding `farmilky-management` as a modern TypeScript + React + Tailwind application. Every existing feature is accounted for, mapped to verified backend-v2 API endpoints, and organized into a clean feature-based architecture. All route paths were cross-checked against the actual backend-v2 route files.

**Key improvements over v1:**
- Full TypeScript strict-mode type safety across all 21 feature modules
- TanStack Query v5 replaces all custom data-fetching hooks (5 hooks → 1 library)
- Tailwind CSS v4 (CSS-first `@theme`) replaces 2500+ lines of custom CSS
- Feature-based module organization (29 flat pages → 21 feature folders)
- React Hook Form + Zod validation on all forms
- Radix UI headless primitives for accessible dialogs, sheets, dropdowns
- URL-driven filters via `useSearchParams` (shareable, bookmarkable, back-button safe)
- Centralized typed API client with consistent error handling
- SSE real-time updates for delivery board (replaces polling)
- Cloudflare Pages deployment with global CDN + SPA `_redirects` routing
- Production-ready for 50+ concurrent users with proper caching, code splitting, and monitoring
