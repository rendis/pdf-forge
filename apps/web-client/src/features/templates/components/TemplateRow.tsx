import { FileText, Edit, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from './TagBadge'
import { StatusBadge } from './StatusBadge'
import type { Template } from '../types'

interface TemplateRowProps {
  template: Template
  onClick?: () => void
}

export function TemplateRow({ template, onClick }: TemplateRowProps) {
  const Icon = template.status === 'DRAFT' ? Edit : FileText

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-accent"
    >
      <td className="border-b border-border py-6 pr-4 align-top">
        <div className="flex items-start gap-4">
          <Icon
            className="pt-1 text-muted-foreground transition-colors group-hover:text-foreground"
            size={24}
          />
          <div>
            <div className="mb-1 font-display text-lg font-medium text-foreground">
              {template.name}
            </div>
            <div className="flex gap-2 font-mono text-xs text-muted-foreground">
              {template.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <div className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {template.version}
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <StatusBadge status={template.status} />
      </td>
      <td className="border-b border-border py-6 pt-8 align-top font-mono text-sm text-muted-foreground">
        {template.updatedAt}
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold tracking-tight',
              template.author.isCurrentUser
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground'
            )}
          >
            {template.author.initials}
          </div>
          <span className="text-sm text-muted-foreground">{template.author.name}</span>
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 text-right align-top">
        <button
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} />
        </button>
      </td>
    </tr>
  )
}
