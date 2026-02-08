import type { TenantStatus } from '@/features/system-injectables/api/system-tenants-api'
import { cn } from '@/lib/utils'

interface TenantStatusBadgeProps {
  status: TenantStatus
  className?: string
}

const statusStyles: Record<TenantStatus, string> = {
  ACTIVE: 'border-success-border bg-success-muted text-success-foreground',
  SUSPENDED: 'border-warning-border bg-warning-muted text-warning-foreground',
  ARCHIVED: 'border-border bg-muted text-muted-foreground',
}

const indicatorStyles: Record<TenantStatus, string> = {
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-yellow-500',
  ARCHIVED: 'bg-gray-400 dark:bg-gray-500',
}

export function TenantStatusBadge({ status, className }: TenantStatusBadgeProps): React.ReactElement {
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
