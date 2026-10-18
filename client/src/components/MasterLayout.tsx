import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FaShieldAlt, FaStore, FaCog, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

/** Shared chrome for the platform master console (header + section nav). */
export function MasterLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg text-white">
              <FaShieldAlt />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Platform administration</p>
              <h1 className="text-lg font-semibold text-slate-900">Master Console</h1>
            </div>
          </div>

          <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/admin" end className={navLink}>
              <FaStore /> Shops
            </NavLink>
            <NavLink to="/admin/settings" className={navLink}>
              <FaCog /> Settings
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <FaSignOutAlt /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">{children}</main>
    </div>
  )
}
