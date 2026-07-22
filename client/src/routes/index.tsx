import { createBrowserRouter, Navigate } from 'react-router-dom'
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
import { ReportsPage } from '../pages/ReportsPage'
import { MachineMonitoringPage } from '../pages/MachineMonitoringPage'
import { SettingsPage } from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <AppLayout title="Dashboard" description="Overview of daily laundry operations and status">
        <DashboardPage />
      </AppLayout>
    ),
  },
  {
    path: '/customers',
    element: (
      <AppLayout title="Customers" description="Manage customer profiles and service history">
        <CustomersPage />
      </AppLayout>
    ),
  },
  {
    path: '/job-orders',
    element: (
      <AppLayout title="Job Orders" description="Review active and completed laundry jobs">
        <JobOrdersPage />
      </AppLayout>
    ),
  },
  {
    path: '/production-board',
    element: (
      <AppLayout title="Production Board" description="Coordinate workflow stages and station activity">
        <ProductionBoardPage />
      </AppLayout>
    ),
  },
  {
    path: '/claim-laundry',
    element: (
      <AppLayout title="Claim Laundry" description="Handle ready pickups and customer handoffs">
        <ClaimLaundryPage />
      </AppLayout>
    ),
  },
  {
    path: '/payments',
    element: (
      <AppLayout title="Payments" description="Track payments and outstanding balances">
        <PaymentsPage />
      </AppLayout>
    ),
  },
  {
    path: '/expenses',
    element: (
      <AppLayout title="Expenses" description="Monitor operational costs and spending categories">
        <ExpensesPage />
      </AppLayout>
    ),
  },
  {
    path: '/sales-summary',
    element: (
      <AppLayout title="Sales Summary" description="End-of-day sales and performance overview">
        <SalesSummaryPage />
      </AppLayout>
    ),
  },
  {
    path: '/cash-drawer',
    element: (
      <AppLayout title="Cash Drawer & Shift" description="Reconcile drawer activity and shift operations">
        <CashDrawerPage />
      </AppLayout>
    ),
  },
  {
    path: '/reports',
    element: (
      <AppLayout title="Reports" description="Analyze operations, finance, and service performance">
        <ReportsPage />
      </AppLayout>
    ),
  },
  {
    path: '/machine-monitoring',
    element: (
      <AppLayout title="Machine Monitoring" description="Monitor equipment utilization and availability">
        <MachineMonitoringPage />
      </AppLayout>
    ),
  },
  {
    path: '/settings',
    element: (
      <AppLayout title="Settings" description="Configure operational defaults and preferences">
        <SettingsPage />
      </AppLayout>
    ),
  },
])
