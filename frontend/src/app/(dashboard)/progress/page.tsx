import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { MyProgress } from '@/features/attendance-gate/components/MyProgress'
import { getUserRole } from '@/features/attendance-gate/roles'

export const metadata: Metadata = { title: 'My progress' }

export default async function ProgressPage() {
  const session = await requireAuth()
  if ((await getUserRole(session.uid)) === 'facilitator') redirect('/workshops')

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="My progress"
        description="Your workshop attendance, updated live as your facilitator marks it."
      />
      <MyProgress uid={session.uid} />
    </div>
  )
}
