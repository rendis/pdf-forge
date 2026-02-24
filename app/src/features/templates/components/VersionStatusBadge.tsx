import { cn } from '@/lib/utils'
import type { VersionStatus } from '@/types/api'

interface VersionStatusBadgeProps {
  status: VersionStatus
}

const statusConfig: Record<
  VersionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'border-warning-border/50 bg-warning-muted text-warning-foreground',
    dotClass: 'bg-warning',
  },
  STAGING: {
    label: 'Staging',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'border-info-border/50 bg-info-muted text-info-foreground',
    dotClass: 'bg-info',
  },
  PUBLISHED: {
    label: 'Published',
    badgeClass: 'border-success-border/50 bg-success-muted text-success-foreground',
    dotClass: 'bg-success',
  },
  ARCHIVED: {
    label: 'Archived',
    badgeClass: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
}

export function VersionStatusBadge({ status }: VersionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
        config.badgeClass
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
