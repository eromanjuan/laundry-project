import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { RouteError } from '../components/ErrorBoundary'
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
import { UserManagementPage } from '../pages/UserManagementPage'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppLayout title="Dashboard" description="Overview of daily laundry operations and status">
          <DashboardPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute>
        <AppLayout title="Customers" description="Manage customer profiles and service history">
          <CustomersPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/job-orders',
    element: (
      <ProtectedRoute>
        <AppLayout title="Job Orders" description="Review active and completed laundry jobs">
          <JobOrdersPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/production-board',
    element: (
      <ProtectedRoute>
        <AppLayout title="Production Board" description="Coordinate workflow stages and station activity">
          <ProductionBoardPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/claim-laundry',
    element: (
      <ProtectedRoute>
        <AppLayout title="Claim Laundry" description="Handle ready pickups and customer handoffs">
          <ClaimLaundryPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/payments',
    element: (
      <ProtectedRoute>
        <AppLayout title="Payments" description="Track payments and outstanding balances">
          <PaymentsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/expenses',
    element: (
      <ProtectedRoute>
        <AppLayout title="Expenses" description="Monitor operational costs and spending categories">
          <ExpensesPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales-summary',
    element: (
      <ProtectedRoute>
        <AppLayout title="Sales Summary" description="End-of-day sales and performance overview">
          <SalesSummaryPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/cash-drawer',
    element: (
      <ProtectedRoute>
        <AppLayout title="Cash Drawer & Shift" description="Reconcile drawer activity and shift operations">
          <CashDrawerPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <ProtectedRoute>
        <AppLayout title="History" description="Analyze operations, finance, service performance, and audit events">
          <HistoryPage />
        </AppLayout>
      </ProtectedRoute>
    ),
   },
   {
    path: '/machine-monitoring',
    element: (
      <ProtectedRoute>
        <AppLayout title="Machine Monitoring" description="Monitor equipment utilization and availability">
          <MachineMonitoringPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/user-management',
    element: (
      <ProtectedRoute requiredRole="Administrator">
        <AppLayout title="User Management" description="Add, edit, disable, and reset staff accounts">
          <UserManagementPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppLayout title="Settings" description="Configure operational defaults and preferences">
          <SettingsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
    ],
  },
])
