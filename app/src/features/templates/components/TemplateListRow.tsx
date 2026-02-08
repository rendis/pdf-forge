import { FileText, Edit, MoreHorizontal, FolderOpen, Pencil, Trash, Layers, Check, Clock, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TemplateListItem } from '@/types/api'

interface TemplateListRowProps {
  template: TemplateListItem
  index?: number
  isExiting?: boolean
  isEntering?: boolean
  isFilterAnimating?: boolean
  onClick?: () => void
  onGoToFolder?: (folderId: string | undefined) => void
  onEdit?: () => void
  onDelete?: () => void
}

export function TemplateListRow({
  template,
  index = 0,
  isExiting = false,
  isEntering = false,
  isFilterAnimating = false,
  onClick,
  onGoToFolder,
  onEdit,
  onDelete,
}: TemplateListRowProps) {
  const { t } = useTranslation()
  const Icon = template.hasPublishedVersion ? FileText : Edit
  const status = template.hasPublishedVersion ? 'PUBLISHED' : 'DRAFT'

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Only animate first 10 rows for performance
  const shouldAnimate = index < 10
  const staggerDelay = shouldAnimate ? index * 0.05 : 0

  // Animation states
  // Exit: slide left and fade out
  // Enter: slide from right and fade in
  const getAnimateState = () => {
    if (isExiting && shouldAnimate) {
      return { opacity: 0, x: -50 }
    }
    return { opacity: 1, x: 0 }
  }

  const getInitialState = () => {
    if (isEntering && shouldAnimate) {
      return { opacity: 0, x: 50 }
    }
    if (isFilterAnimating && shouldAnimate) {
      return { opacity: 0, x: 20 } // Slide más sutil para filtrado
    }
    return { opacity: 1, x: 0 }
  }

  return (
    <motion.tr
      initial={getInitialState()}
      animate={getAnimateState()}
      transition={{
        duration: isFilterAnimating ? 0.15 : 0.2,
        ease: 'easeOut',
        delay: (isExiting || isEntering || isFilterAnimating) ? staggerDelay : 0,
      }}
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-accent"
      style={{ overflow: 'hidden' }}
    >
      <td className="border-b border-border py-6 pl-4 pr-4 align-top">
        <div className="flex items-start gap-4">
          <Icon
            className="pt-1 text-muted-foreground transition-colors group-hover:text-foreground"
            size={24}
          />
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-display text-lg font-medium text-foreground">
                {template.title}
              </span>
              {template.documentTypeCode && (
                <span className="shrink-0 rounded-sm border px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  {template.documentTypeCode}
                </span>
              )}
              {template.hasPublishedVersion && !template.documentTypeCode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 items-center gap-1 border border-warning/50 bg-warning-muted/60 px-1.5 py-0.5 text-warning-foreground dark:border-warning-border dark:bg-warning-muted/50">
                      <AlertTriangle size={12} />
                      <span className="font-mono text-[10px] uppercase">
                        {t('templates.warnings.noDocumentType', 'No type')}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {t('templates.warnings.noDocumentTypeDescription', "This template has a published version but no document type. It won't be found via the internal render API.")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <div className="flex items-center gap-2">
          {/* Total de versiones */}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Layers size={14} />
            <span className="font-mono text-xs">{template.versionCount}</span>
          </span>

          {/* Versión publicada (solo si existe) */}
          {template.hasPublishedVersion && template.publishedVersionNumber && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 border border-success-border/50 bg-success-muted px-1.5 py-0.5 text-success">
                  <Check size={12} />
                  <span className="font-mono text-[10px]">v{template.publishedVersionNumber}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t('templates.tooltips.publishedVersion', 'Versión publicada: v{{version}}', {
                  version: template.publishedVersionNumber,
                })}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Versiones programadas (solo si hay) */}
          {template.scheduledVersionCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 border border-info-border/50 bg-info-muted px-1.5 py-0.5 text-info">
                  <Clock size={12} />
                  <span className="font-mono text-[10px]">{template.scheduledVersionCount}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t('templates.tooltips.scheduledVersions', '{{count}} versión(es) programada(s) para publicar', {
                  count: template.scheduledVersionCount,
                })}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider ${
            status === 'PUBLISHED' ? 'text-success-foreground' : 'text-warning-foreground'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'PUBLISHED' ? 'bg-success' : 'bg-warning'
            }`}
          />
          {status === 'PUBLISHED'
            ? t('templates.status.published', 'Published')
            : t('templates.status.draft', 'Draft')}
        </span>
      </td>
      <td className="border-b border-border py-6 pt-8 align-top font-mono text-sm text-muted-foreground">
        {formatDate(template.updatedAt)}
      </td>
      <td className="border-b border-border py-6 pt-7 pr-4 text-center align-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() => onGoToFolder?.(template.folderId)}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {t('templates.actions.goToFolder', 'Go to folder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.()}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('templates.actions.edit', 'Edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.()}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              {t('templates.actions.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  )
}
