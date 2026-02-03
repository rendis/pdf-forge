import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  isActive?: boolean
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 py-6 font-mono text-sm text-muted-foreground">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight size={14} />}
          {item.isActive ? (
            <span className="border-b border-foreground font-medium text-foreground">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className={cn(
                'transition-colors hover:text-foreground',
                'cursor-pointer bg-transparent border-none p-0'
              )}
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
