import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TenantWithRole } from '../types'

interface TenantCardProps {
  tenant: TenantWithRole
  onClick: () => void
  lastAccessed?: string
  userCount?: number
}

export function TenantCard({
  tenant,
  onClick,
  lastAccessed,
  userCount,
}: TenantCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center justify-between',
        'rounded-sm border border-transparent border-b-border px-4 py-6',
        'outline-none transition-all duration-200',
        'hover:z-10 hover:border-foreground hover:bg-accent',
        '-mb-px'
      )}
    >
      <h3
        className={cn(
          'text-left font-display text-xl font-medium tracking-tight text-foreground md:text-2xl',
          'transition-transform duration-300 group-hover:translate-x-2'
        )}
      >
        {tenant.name}
      </h3>
      <div className="flex items-center gap-6 md:gap-8">
        {lastAccessed && (
          <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground md:text-xs">
            Last accessed: {lastAccessed}
          </span>
        )}
        {userCount !== undefined && (
          <span className="hidden whitespace-nowrap font-mono text-[10px] text-muted-foreground md:inline md:text-xs">
            {userCount} users
          </span>
        )}
        <ArrowRight
          className="text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
          size={24}
        />
      </div>
    </button>
  )
}
