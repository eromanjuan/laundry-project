import { lazy } from 'react'

/**
 * Code-split page components.
 *
 * Each page is fetched the first time its route is visited, so signing in and
 * opening one screen doesn't download every screen. The shared vendors (React,
 * router, Firebase) stay in a common chunk the browser caches once. Suspense
 * lives in App.tsx, above the router.
 *
 * They live here rather than in `index.tsx` so that module exports only lazy
 * components — mixing a non-component export such as the router object in with
 * component definitions breaks React Fast Refresh.
 */
export const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
export const CustomersPage = lazy(() => import('../pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
export const JobOrdersPage = lazy(() => import('../pages/JobOrdersPage').then((m) => ({ default: m.JobOrdersPage })))
export const ProductionBoardPage = lazy(() => import('../pages/ProductionBoardPage').then((m) => ({ default: m.ProductionBoardPage })))
export const ClaimLaundryPage = lazy(() => import('../pages/ClaimLaundryPage').then((m) => ({ default: m.ClaimLaundryPage })))
export const PaymentsPage = lazy(() => import('../pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
export const ExpensesPage = lazy(() => import('../pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
export const SalesSummaryPage = lazy(() => import('../pages/SalesSummaryPage').then((m) => ({ default: m.SalesSummaryPage })))
export const CashDrawerPage = lazy(() => import('../pages/CashDrawerPage').then((m) => ({ default: m.CashDrawerPage })))
export const HistoryPage = lazy(() => import('../pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
export const MachineMonitoringPage = lazy(() => import('../pages/MachineMonitoringPage').then((m) => ({ default: m.MachineMonitoringPage })))
export const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
export const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })))
export const RegisterShopPage = lazy(() => import('../pages/RegisterShopPage').then((m) => ({ default: m.RegisterShopPage })))
export const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
export const MasterSettingsPage = lazy(() => import('../pages/MasterSettingsPage').then((m) => ({ default: m.MasterSettingsPage })))
export const HomeRedirectPage = lazy(() => import('../pages/HomeRedirectPage').then((m) => ({ default: m.HomeRedirectPage })))
export const UserManagementPage = lazy(() => import('../pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })))
export const TrackOrderPage = lazy(() => import('../pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })))