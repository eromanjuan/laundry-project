import type { ReactNode } from 'react'
import { FaBars, FaBell, FaCalendarAlt, FaSearch } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface TopbarProps {
  title: string
  description: string
  action?: ReactNode
  onMenuClick?: () => void
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function Topbar({ title, description, action, onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="z-20 shrink-0 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="mt-1 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-100 lg:hidden"
          >
            <FaBars />
          </button>
          <div>
            <p className="text-sm font-semibold text-blue-600">Laundry Project POS</p>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <FaCalendarAlt />
            <span>{today}</span>
          </div>
          <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex">
            <FaSearch />
            <input
              className="w-32 border-none bg-transparent outline-none placeholder:text-slate-400 md:w-48"
              placeholder="Search"
              aria-label="Search"
            />
          </label>
          <button className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100">
            <FaBell />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-semibold text-white">
              {user?.photo ? <img src={user.photo} alt={user.name} className="h-full w-full object-cover" /> : (user?.name?.charAt(0) ?? '?')}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.name ?? 'Guest'}</p>
              <p className="text-xs text-slate-500">{user?.role ?? 'Signed out'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Logout
          </button>
          {action}
        </div>
      </div>
    </header>
  )
}
