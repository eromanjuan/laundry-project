import { NavLink } from 'react-router-dom'
import {
  FaChartPie,
  FaUsers,
  FaClipboardList,
  FaLayerGroup,
  FaTshirt,
  FaMoneyCheckAlt,
  FaReceipt,
  FaChartBar,
  FaCogs,
  FaDesktop,
  FaHistory,
  FaUserShield,
} from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FaChartPie },
  { to: '/customers', label: 'Customers', icon: FaUsers },
  { to: '/job-orders', label: 'Job Orders', icon: FaClipboardList },
  { to: '/production-board', label: 'Production Board', icon: FaLayerGroup },
  { to: '/claim-laundry', label: 'Claim Laundry', icon: FaTshirt },
  { to: '/payments', label: 'Payments', icon: FaMoneyCheckAlt },
  { to: '/expenses', label: 'Expenses', icon: FaReceipt },
  { to: '/sales-summary', label: 'Sales Summary', icon: FaChartBar },
  { to: '/cash-drawer', label: 'Cash Drawer', icon: FaMoneyCheckAlt },
  { to: '/machine-monitoring', label: 'Machine Monitoring', icon: FaDesktop },
  { to: '/history', label: 'History', icon: FaHistory },
  { to: '/settings', label: 'Settings', icon: FaCogs },
]

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
      : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
  }`

/** Inner sidebar content — shared by the desktop rail and the mobile drawer. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const { logoUrl } = useBranding()

  return (
    <div className="flex h-full flex-col border-r border-blue-100 bg-slate-950 text-slate-100">
      <div className="shrink-0 border-b border-blue-900/60 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow ring-1 ring-white/20">
            <img src={logoUrl} alt="Laundry Project" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Laundry Project</p>
            <h2 className="text-lg font-semibold text-white">Operations Center</h2>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">Modern ERP-style control for daily laundry operations</p>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={linkClasses}>
            <Icon className="text-base" />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.role === 'Administrator' ? (
          <NavLink to="/user-management" onClick={onNavigate} className={linkClasses}>
            <FaUserShield className="text-base" />
            <span>User Management</span>
          </NavLink>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-blue-900/60 px-6 py-5">
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">System</p>
          <p className="mt-2 text-sm font-semibold text-white">All modules online</p>
          <p className="mt-1 text-xs text-slate-400">Ready for business operations</p>
        </div>
      </div>
    </div>
  )
}

/** Fixed desktop sidebar rail (hidden on small screens). */
export function Sidebar() {
  return (
    <aside className="hidden h-screen w-72 shrink-0 lg:block">
      <SidebarContent />
    </aside>
  )
}
