import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export function LoadError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
    >
      <EmptyState
        icon={AlertTriangle}
        title="Could not load attendance"
        description={`${message} Check your connection and refresh the page.`}
      />
    </div>
  )
}
