import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteError } from '../components/ErrorBoundary'
import { ShopGuard } from '../components/ShopGuard'
import { MasterRoute } from '../components/MasterRoute'
import { AppLayout } from '../layouts/AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { CustomersPage } from '../pages/CustomersPage'
import { JobOrdersPage } from '../pages/JobOrdersPage'
import { ProductionBoardPage } from '../pages/ProductionBoardPage'
import { ClaimLaundryPage } from '../pages/ClaimLaundryPage'
import { PaymentsPage } from '../pages/PaymentsPage'
import { ExpensesPage } from '../pages/ExpensesPage'
import { SalesSummaryPage } from '../pages/SalesSummaryPage'
import { CashDrawerPage } from '../pages/CashDrawerPage'
import { HistoryPage } from '../pages/HistoryPage'
import { MachineMonitoringPage } from '../pages/MachineMonitoringPage'
import { SettingsPage } from '../pages/SettingsPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterShopPage } from '../pages/RegisterShopPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { MasterSettingsPage } from '../pages/MasterSettingsPage'
import { HomeRedirectPage } from '../pages/HomeRedirectPage'
import { UserManagementPage } from '../pages/UserManagementPage'
import { TrackOrderPage } from '../pages/TrackOrderPage'
import type { ShopRole } from '../data/seeds'

/**
 * Wrap a shop page in the workspace guard + shared layout. The guard resolves
 * the `:shopSlug`, verifies membership and shop status, and (optionally)
 * restricts the route to specific shop roles. `Administrator` is always allowed.
 */
function shopPage(
  title: string,
  description: string,
  node: ReactNode,
  allowedRoles?: ShopRole[],
): ReactNode {
  return (
    <ShopGuard allowedRoles={allowedRoles}>
      <AppLayout title={title} description={description}>
        {node}
      </AppLayout>
    </ShopGuard>
  )
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        element: <HomeRedirectPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterShopPage />,
      },
      {
        // Platform-wide master console (registry, approvals, suspensions).
        path: '/admin',
        element: (
          <MasterRoute>
            <AdminDashboardPage />
          </MasterRoute>
        ),
      },
      {
        // Platform administrators: add / revoke other master accounts.
        path: '/admin/settings',
        element: (
          <MasterRoute>
            <MasterSettingsPage />
          </MasterRoute>
        ),
      },
      {
        // Legacy public order tracking (receipts printed before multi-tenancy).
        path: '/track/:id',
        element: <TrackOrderPage />,
      },
      {
        // Public order tracking reached by scanning a shop receipt QR.
        path: '/track/:shopId/:key',
        element: <TrackOrderPage />,
      },
      {
        // Each shop gets its own isolated workspace under `/{slug}`.
        path: '/:shopSlug',
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: shopPage('Dashboard', 'Overview of daily laundry operations and status', <DashboardPage />) },
          { path: 'customers', element: shopPage('Customers', 'Manage customer profiles and service history', <CustomersPage />) },
          { path: 'job-orders', element: shopPage('Job Orders', 'Review active and completed laundry jobs', <JobOrdersPage />) },
          { path: 'production-board', element: shopPage('Production Board', 'Coordinate workflow stages and station activity', <ProductionBoardPage />) },
          { path: 'claim-laundry', element: shopPage('Claim Laundry', 'Handle ready pickups and customer handoffs', <ClaimLaundryPage />) },
          { path: 'payments', element: shopPage('Payments', 'Track payments and outstanding balances', <PaymentsPage />) },
          { path: 'expenses', element: shopPage('Expenses', 'Monitor operational costs and spending categories', <ExpensesPage />) },
          { path: 'sales-summary', element: shopPage('Sales Summary', 'End-of-day sales and performance overview', <SalesSummaryPage />) },
          { path: 'cash-drawer', element: shopPage('Cash Drawer & Shift', 'Reconcile drawer activity and shift operations', <CashDrawerPage />) },
          { path: 'history', element: shopPage('History', 'Analyze operations, finance, service performance, and audit events', <HistoryPage />) },
          { path: 'machine-monitoring', element: shopPage('Machine Monitoring', 'Monitor equipment utilization and availability', <MachineMonitoringPage />) },
          {
            path: 'user-management',
            // Administrators only (no extra roles beyond the implicit owner).
            element: shopPage('User Management', 'Add, edit, disable, and reset staff accounts', <UserManagementPage />, []),
          },
          {
            path: 'settings',
            element: shopPage('Settings', 'Configure operational defaults and preferences', <SettingsPage />, ['Manager']),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
