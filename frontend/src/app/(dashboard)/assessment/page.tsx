import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { REQUIRED_WORKSHOPS } from '@/features/attendance-gate/gate'
import { getUserRole } from '@/features/attendance-gate/roles'
import { adminDb } from '@/lib/firebase/admin'

export const metadata: Metadata = { title: 'Final assessment' }

export default async function AssessmentPage() {
  const session = await requireAuth()
  const role = await getUserRole(session.uid)

  // Checked on the server, so the brief is never sent to a locked student.
  const access =
    role === 'facilitator'
      ? null
      : (await adminDb.collection('assessment_access').doc(session.uid).get()).data()
  const unlocked = role === 'facilitator' || access?.unlocked === true

  if (!unlocked) {
    const attended = Math.min(
      (access?.attendedCount as number | undefined) ?? 0,
      REQUIRED_WORKSHOPS
    )
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader
          title="Final assessment"
          description={`Locked until you attend ${REQUIRED_WORKSHOPS} of the 3 module workshops.`}
        />
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={Lock}
            title="This assessment is locked"
            description={`You have attended ${attended} of the ${REQUIRED_WORKSHOPS} workshops needed. Present and Late count.`}
            action={
              <Link
                href="/progress"
                className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                See my attendance
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Final assessment"
        description={
          role === 'facilitator'
            ? 'Facilitator preview. Students see this once they meet the workshop rule.'
            : 'Unlocked. You met the workshop attendance rule.'
        }
      />
      <article className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 text-sm leading-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Edit a manuscript sample</h2>
        <p>
          You will receive a 2,000 word extract from an open access monograph. Carry out a
          structural and copy edit, then write a 500 word editorial letter to the author explaining
          your main changes.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use tracked changes for all copy edits.</li>
          <li>Apply the house style sheet from Module 2.</li>
          <li>Flag any permissions or citation issues for the author.</li>
        </ul>
        <p className="text-zinc-500">
          Submit through the course page once you are ready. You can ask your facilitator for
          feedback on a draft before final submission.
        </p>
      </article>
    </div>
  )
}
