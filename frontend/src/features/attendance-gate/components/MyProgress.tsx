'use client'

import Link from 'next/link'
import { CalendarClock, Lock, Unlock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { REQUIRED_WORKSHOPS } from '../gate'
import { useAssessmentAccess, useAttendance, useWorkshops } from '../hooks/useAttendanceData'
import { LoadError } from './LoadError'
import { StatusBadge } from './StatusBadge'

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

export function MyProgress({ uid }: { uid: string }) {
  const workshops = useWorkshops()
  const attendance = useAttendance(uid)
  const access = useAssessmentAccess(uid)

  if (workshops.loading || attendance.loading || access.loading) {
    return (
      <div aria-hidden className="space-y-6">
        <div className="h-36 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-44 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
    )
  }

  const loadError = workshops.error ?? attendance.error ?? access.error
  if (loadError) return <LoadError message={loadError.message} />

  if (workshops.data.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No workshops scheduled yet"
        description="Your facilitator will add the three module workshops here."
      />
    )
  }

  // The gate result comes from the server, not from counting on the client.
  const gate = access.data[0]
  const attendedCount = Math.min(gate?.attendedCount ?? 0, REQUIRED_WORKSHOPS)
  const unlocked = gate?.unlocked ?? false

  return (
    <div className="space-y-6">
      <section
        aria-live="polite"
        className={cn(
          'rounded-lg border p-4 shadow-sm sm:p-6',
          unlocked
            ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
        )}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {unlocked ? (
            <Unlock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          )}
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-semibold">
                {unlocked ? 'Final assessment unlocked' : 'Final assessment locked'}
              </h2>
              <p className={cn('mt-1 text-sm', unlocked ? 'opacity-80' : 'text-zinc-500')}>
                {unlocked
                  ? 'You have attended enough workshops. You can start the final assessment now.'
                  : `Attend any ${REQUIRED_WORKSHOPS} of the 3 workshops to unlock it. Present and Late count. Excused and Absent do not.`}
              </p>
            </div>

            <div>
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: REQUIRED_WORKSHOPS }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full',
                      i < attendedCount
                        ? unlocked
                          ? 'bg-white dark:bg-black'
                          : 'bg-black dark:bg-white'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm font-medium">
                {attendedCount} of {REQUIRED_WORKSHOPS} workshops attended
              </p>
            </div>

            {unlocked && (
              <Link
                href="/assessment"
                className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800"
              >
                Open final assessment
              </Link>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Workshops</h2>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {workshops.data.map((w) => {
            const record = attendance.data.find((r) => r.workshopId === w.id)
            return (
              <li key={w.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    Module {w.moduleNumber}: {w.title}
                  </p>
                  <p className="text-xs text-zinc-500">{dateFormat.format(w.startsAt.toDate())}</p>
                </div>
                <StatusBadge status={record?.status ?? null} />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
