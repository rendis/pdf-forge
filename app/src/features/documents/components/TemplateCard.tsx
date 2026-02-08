import { useTranslation } from 'react-i18next'
import { AlertTriangle, FileText } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TemplateListItem } from '@/types/api'

interface TemplateCardProps {
  template: TemplateListItem
  onClick?: () => void
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const { t } = useTranslation()

  const hasWarning = template.hasPublishedVersion && !template.documentTypeCode

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`group relative flex cursor-pointer flex-col gap-3 border border-border bg-background p-5 transition-colors hover:border-foreground ${hasWarning ? 'border-l-2 border-l-warning bg-warning-muted/60 dark:border-l-warning-border dark:bg-warning-muted/50' : ''}`}
    >
      {/* Title row */}
      <div className="flex items-start gap-3">
        {hasWarning ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle
                className="mt-0.5 shrink-0 text-warning-foreground"
                size={20}
                strokeWidth={1.5}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {t('templates.warnings.noDocumentTypeDescription', "This template has a published version but no document type. It won't be found via the internal render API.")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <FileText
            className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            size={20}
            strokeWidth={1.5}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-medium leading-snug text-foreground decoration-1 underline-offset-4 group-hover:underline">
              {template.title}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {template.hasPublishedVersion
                ? t('templates.status.published', 'Published')
                : t('templates.status.draft', 'Draft')}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 pl-8 text-muted-foreground">
        {/* Tags with color dots */}
        {template.tags && template.tags.length > 0 && (
          <>
            {template.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 font-mono text-[10px]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
            {template.tags.length > 2 && (
              <span className="font-mono text-[10px]">
                +{template.tags.length - 2}
              </span>
            )}
            <span className="text-[10px]">·</span>
          </>
        )}
        {/* Date */}
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {formatDate(template.updatedAt ?? template.createdAt)}
        </span>
      </div>
    </div>
  )
}
