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
} from 'react-icons/fa'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FaChartPie },
  { to: '/customers', label: 'Customers', icon: FaUsers },
  { to: '/job-orders', label: 'Job Orders', icon: FaClipboardList },
  { to: '/production-board', label: 'Production Board', icon: FaLayerGroup },
  { to: '/claim-laundry', label: 'Claim Laundry', icon: FaTshirt },
  { to: '/payments', label: 'Payments', icon: FaMoneyCheckAlt },
  { to: '/expenses', label: 'Expenses', icon: FaReceipt },
  { to: '/reports', label: 'Reports', icon: FaChartBar },
  { to: '/machine-monitoring', label: 'Machine Monitoring', icon: FaDesktop },
  { to: '/settings', label: 'Settings', icon: FaCogs },
]

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-blue-100 bg-slate-950 text-slate-100 lg:flex">
      <div className="border-b border-blue-900/60 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
          Laundry Project POS
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Operations Center</h2>
        <p className="mt-2 text-sm text-slate-400">
          Modern ERP-style control for daily laundry operations
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
              }`
            }
          >
            <Icon className="text-base" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-blue-900/60 px-6 py-5">
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">System</p>
          <p className="mt-2 text-sm font-semibold text-white">All modules online</p>
          <p className="mt-1 text-xs text-slate-400">Ready for business operations</p>
        </div>
      </div>
    </aside>
  )
}
