import { requireAuth } from '@/actions/auth.actions'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { getUserRole } from '@/features/attendance-gate/roles'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const role = await getUserRole(session.uid)
  return (
    <DashboardShell role={role} email={session.email ?? null}>
      {children}
    </DashboardShell>
  )
}
