import type { ReactNode } from 'react'
import { FaBell, FaCalendarAlt, FaSearch } from 'react-icons/fa'

interface TopbarProps {
  title: string
  description: string
  action?: ReactNode
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function Topbar({ title, description, action }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Laundry Project POS</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <FaCalendarAlt />
            <span>{today}</span>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
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
            <div className="h-8 w-8 rounded-full bg-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Administrator</p>
              <p className="text-xs text-slate-500">System Manager</p>
            </div>
          </div>
          {action}
        </div>
      </div>
    </header>
  )
}
