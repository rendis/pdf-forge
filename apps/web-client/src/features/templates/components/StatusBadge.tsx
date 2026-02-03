import { cn } from '@/lib/utils'
import type { TemplateStatus } from '../types'

interface StatusBadgeProps {
  status: TemplateStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest',
        status === 'PUBLISHED'
          ? 'border-foreground bg-background font-bold text-foreground'
          : 'border-border bg-background font-medium text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'PUBLISHED' ? 'bg-foreground' : 'border border-muted-foreground'
        )}
      />
      {status === 'PUBLISHED' ? 'Published' : status === 'DRAFT' ? 'Draft' : 'Archived'}
    </span>
  )
}
