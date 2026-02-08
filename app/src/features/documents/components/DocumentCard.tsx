import { FileText, Download, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '../types'

interface DocumentCardProps {
  name: string
  type: DocumentStatus
  size: string
  date: string
  onClick?: () => void
}

export function DocumentCard({ name, type, size, date, onClick }: DocumentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-6 border border-border bg-background p-6 transition-colors hover:border-foreground'
      )}
    >
      {/* Action buttons */}
      <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={16} />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Icon */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-muted">
          <FileText className="text-muted-foreground" size={24} strokeWidth={1} />
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              type === 'FINALIZED' ? 'bg-foreground' : 'border border-muted-foreground'
            )}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {type === 'FINALIZED' ? 'Finalized' : type === 'DRAFT' ? 'Draft' : 'Archived'}
          </span>
        </div>
        <h3 className="mb-1 truncate font-display text-lg font-medium leading-snug text-foreground">
          {name}
        </h3>
        <div className="mt-4 flex items-end justify-between border-t border-muted pt-4">
          <p className="font-mono text-[10px] text-muted-foreground">{size}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{date}</p>
        </div>
      </div>
    </div>
  )
}
