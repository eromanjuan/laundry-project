import type { ReactNode } from 'react'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

interface AppLayoutProps {
  children: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function AppLayout({ children, title, description, action }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <Topbar title={title} description={description} action={action} />
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
