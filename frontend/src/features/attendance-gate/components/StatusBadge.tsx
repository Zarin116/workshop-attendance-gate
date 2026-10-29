import { cn } from '@/lib/utils'
import type { AttendanceStatus } from '@/types/firestore'
import { countsAsAttended } from '../gate'
import { STATUS_LABELS } from '../schemas'

export function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex shrink-0 rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs whitespace-nowrap text-zinc-500 dark:border-zinc-700">
        Not marked yet
      </span>
    )
  }

  const attended = countsAsAttended(status)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        attended
          ? 'bg-black text-white dark:bg-white dark:text-black'
          : 'border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
      )}
    >
      {STATUS_LABELS[status]}
      <span className="sr-only">{attended ? ' (counts)' : ' (does not count)'}</span>
    </span>
  )
}
