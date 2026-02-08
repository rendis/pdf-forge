import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'bg-green-500', label: 'Active' },
  INVITED: { color: 'bg-yellow-500', label: 'Invited' },
  SUSPENDED: { color: 'bg-red-500', label: 'Suspended' },
  SHADOW: { color: 'bg-gray-400', label: 'Pending' },
}

interface StatusIndicatorProps {
  status: string
  className?: string
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] ?? { color: 'bg-gray-400', label: status }

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.color)} />
      {config.label}
    </span>
  )
}
