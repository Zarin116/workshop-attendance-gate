import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { AttendanceRegister } from '@/features/attendance-gate/components/AttendanceRegister'
import { CreateWorkshopForm } from '@/features/attendance-gate/components/CreateWorkshopForm'
import { getUserRole, listStudents } from '@/features/attendance-gate/roles'

export const metadata: Metadata = { title: 'Workshops' }

export default async function WorkshopsPage() {
  const session = await requireAuth()
  if ((await getUserRole(session.uid)) !== 'facilitator') redirect('/progress')

  const students = await listStudents()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshops"
        description="Mark attendance for each module workshop. Any 2 of 3 attended (Present or Late) unlocks the final assessment."
      />
      <CreateWorkshopForm />
      <AttendanceRegister students={students} />
    </div>
  )
}
