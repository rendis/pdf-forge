import type { WorkspaceStatus } from '@/features/workspaces/types'
import { cn } from '@/lib/utils'

interface WorkspaceStatusBadgeProps {
  status: WorkspaceStatus
  className?: string
}

const statusStyles: Record<WorkspaceStatus, string> = {
  ACTIVE: 'border-success-border bg-success-muted text-success-foreground',
  SUSPENDED: 'border-warning-border bg-warning-muted text-warning-foreground',
  ARCHIVED: 'border-border bg-muted text-muted-foreground',
}

const indicatorStyles: Record<WorkspaceStatus, string> = {
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-yellow-500',
  ARCHIVED: 'bg-gray-400 dark:bg-gray-500',
}

export function WorkspaceStatusBadge({
  status,
  className,
}: WorkspaceStatusBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs uppercase',
        statusStyles[status],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', indicatorStyles[status])} />
      {status}
    </span>
  )
}
