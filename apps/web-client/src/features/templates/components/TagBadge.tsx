import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string | { name: string; color?: string }
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const name = typeof tag === 'string' ? tag : tag.name
  const color = typeof tag === 'object' ? tag.color : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground',
        className
      )}
    >
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {name}
    </span>
  )
}
