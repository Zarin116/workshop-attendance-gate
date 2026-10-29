import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import type { UserRole } from '@/types/firestore'

export function DashboardShell({
  children,
  role,
  email,
}: {
  children: ReactNode
  role: UserRole
  email: string | null
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar role={role} email={email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
