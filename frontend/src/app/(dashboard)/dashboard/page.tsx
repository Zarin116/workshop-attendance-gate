import { redirect } from 'next/navigation'
import { requireAuth } from '@/actions/auth.actions'
import { getUserRole } from '@/features/attendance-gate/roles'

// Sign in lands here, so send each role to the page they actually use.
export default async function DashboardPage() {
  const session = await requireAuth()
  const role = await getUserRole(session.uid)
  redirect(role === 'facilitator' ? '/workshops' : '/progress')
}
