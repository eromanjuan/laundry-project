import { useState, type ReactNode } from 'react'
import { FaTimes } from 'react-icons/fa'
import { Sidebar, SidebarContent } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

interface AppLayoutProps {
  children: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function AppLayout({ children, title, description, action }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800">
      <div className="flex h-full">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile drawer */}
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[82%] shadow-2xl">
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar title={title} description={description} action={action} onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
