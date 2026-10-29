'use client'

import { useState } from 'react'
import { CalendarPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { AttendanceStatus } from '@/types/firestore'
import { markAttendance } from '../actions/attendance.actions'
import { REQUIRED_WORKSHOPS, countsAsAttended } from '../gate'
import { useAssessmentAccess, useAttendance, useWorkshops } from '../hooks/useAttendanceData'
import type { StudentSummary } from '../roles'
import { STATUS_LABELS } from '../schemas'
import { LoadError } from './LoadError'

const STATUSES = Object.keys(STATUS_LABELS) as AttendanceStatus[]

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

export function AttendanceRegister({ students }: { students: StudentSummary[] }) {
  const workshops = useWorkshops()
  const attendance = useAttendance()
  const access = useAssessmentAccess()
  // Cell currently being saved, as `${workshopId}_${studentUid}`
  const [saving, setSaving] = useState<string | null>(null)

  if (workshops.loading || attendance.loading || access.loading) {
    return (
      <div aria-hidden className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  const loadError = workshops.error ?? attendance.error ?? access.error
  if (loadError) return <LoadError message={loadError.message} />

  if (workshops.data.length === 0) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title="No workshops yet"
        description="Add the first workshop above. Each module can have one."
      />
    )
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students yet"
        description="Students appear here after they sign up and verify their email."
      />
    )
  }

  const statusFor = (workshopId: string, studentUid: string) =>
    attendance.data.find((r) => r.workshopId === workshopId && r.studentUid === studentUid)
      ?.status ?? ''

  const handleChange = async (workshopId: string, studentUid: string, status: string) => {
    setSaving(`${workshopId}_${studentUid}`)
    const result = await markAttendance({ workshopId, studentUid, status })
    setSaving(null)
    if (!result.success) toast.error(result.error ?? 'Failed to save attendance')
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Workshop attendance register</caption>
        <thead>
          <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
            {/* Student names stay in view while the table scrolls sideways on phones */}
            <th
              scope="col"
              className="sticky left-0 w-48 border-r border-zinc-100 bg-white px-3 py-3 font-medium sm:px-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              Student
            </th>
            {workshops.data.map((w) => (
              <th key={w.id} scope="col" className="w-48 px-4 py-3 font-medium">
                <span className="block">Module {w.moduleNumber}</span>
                <span className="block text-xs font-normal text-zinc-500">{w.title}</span>
                <span className="block text-xs font-normal text-zinc-500">
                  {dateFormat.format(w.startsAt.toDate())}
                </span>
              </th>
            ))}
            <th scope="col" className="px-4 py-3 font-medium">
              Final assessment
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const gate = access.data.find((a) => a.studentUid === student.uid)
            return (
              <tr
                key={student.uid}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <th
                  scope="row"
                  className="sticky left-0 border-r border-zinc-100 bg-white px-3 py-3 text-left font-medium whitespace-nowrap sm:px-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {student.name}
                </th>
                {workshops.data.map((w) => {
                  const key = `${w.id}_${student.uid}`
                  const status = statusFor(w.id, student.uid)
                  return (
                    <td key={w.id} className="px-4 py-3">
                      <select
                        aria-label={`${student.name}, Module ${w.moduleNumber} attendance`}
                        value={status}
                        disabled={saving === key}
                        onChange={(e) => handleChange(w.id, student.uid, e.target.value)}
                        className={cn(
                          'h-10 w-32 rounded-md border bg-white px-2 text-sm focus:ring-2 focus:ring-zinc-500 focus:outline-none disabled:opacity-50 dark:bg-zinc-900',
                          // Unmarked cells look unfinished; attended ones stand out
                          status === ''
                            ? 'border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700'
                            : countsAsAttended(status)
                              ? 'border-zinc-900 font-medium dark:border-zinc-200'
                              : 'border-zinc-300 dark:border-zinc-700'
                        )}
                      >
                        <option value="" disabled>
                          Not marked
                        </option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                })}
                <td className="px-4 py-3">
                  {gate?.unlocked ? (
                    <span className="inline-flex rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white dark:bg-white dark:text-black">
                      Unlocked
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-zinc-500">
                      Locked ({gate?.attendedCount ?? 0} of {REQUIRED_WORKSHOPS})
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
