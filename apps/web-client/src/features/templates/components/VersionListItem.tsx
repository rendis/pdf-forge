import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import {
    Archive,
    Calendar,
    CalendarCheck,
    CalendarClock,
    Clock,
    Copy,
    ExternalLink,
    Send,
    Trash2,
    XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VersionStatusBadge } from './VersionStatusBadge'

interface VersionListItemProps {
  version: TemplateVersionSummaryResponse
  onOpenEditor: (versionId: string) => void
  onPublish?: (version: TemplateVersionSummaryResponse) => void
  onSchedule?: (version: TemplateVersionSummaryResponse) => void
  onCancelSchedule?: (version: TemplateVersionSummaryResponse) => void
  onArchive?: (version: TemplateVersionSummaryResponse) => void
  onDelete?: (version: TemplateVersionSummaryResponse) => void
  onClone?: (version: TemplateVersionSummaryResponse) => void
  isHighlighted?: boolean
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

function ActionButton({ icon, label, onClick, variant = 'default' }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${
            variant === 'destructive'
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function VersionListItem({
  version,
  onOpenEditor,
  onPublish,
  onSchedule,
  onCancelSchedule,
  onArchive,
  onDelete,
  onClone,
  isHighlighted = false,
}: VersionListItemProps) {
  const { t } = useTranslation()

  const showPublish = version.status === 'DRAFT' || version.status === 'SCHEDULED'
  const showSchedule = version.status === 'DRAFT'
  const showCancelSchedule = version.status === 'SCHEDULED'
  const showArchive = version.status === 'PUBLISHED'
  const showDelete = version.status === 'DRAFT'
  const showClone = !!onClone // Always visible if handler is provided

  const hasActions = showPublish || showSchedule || showCancelSchedule || showArchive || showDelete || showClone

  return (
    <div
      onClick={() => onOpenEditor(version.id)}
      className={cn(
        'group cursor-pointer border-b border-border px-4 py-4 transition-colors hover:bg-accent',
        isHighlighted && 'animate-pulse-highlight'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Version number and name */}
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background font-mono text-xs font-medium">
            v{version.versionNumber}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{version.name}</span>
              <ExternalLink
                size={14}
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            {version.description && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                {version.description}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <VersionStatusBadge status={version.status} />
      </div>

      {/* Metadata row with action buttons */}
      <div className="mt-3 flex items-center justify-between pl-11">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {t('templates.versionInfo.createdAt', 'Created')}: {formatDate(version.createdAt)}
          </span>
          {version.scheduledPublishAt && (
            <span className="flex items-center gap-1 text-info">
              <CalendarClock size={12} />
              {t('templates.versionInfo.scheduledAt', 'Scheduled')}:{' '}
              {formatDate(version.scheduledPublishAt)}
            </span>
          )}
          {version.publishedAt && (
            <span className="flex items-center gap-1 text-success">
              <CalendarCheck size={12} />
              {t('templates.versionInfo.publishedAt', 'Published')}: {formatDate(version.publishedAt)}
            </span>
          )}
          {version.archivedAt && (
            <span className="flex items-center gap-1">
              <Archive size={12} />
              {t('templates.versionInfo.archivedAt', 'Archived')}: {formatDate(version.archivedAt)}
            </span>
          )}
        </div>

        {/* Action buttons - always visible, aligned with metadata */}
        {hasActions && (
          <div className="flex items-center gap-1">
            {showClone && (
              <ActionButton
                icon={<Copy size={18} />}
                label={t('templates.versions.actions.clone', 'Clonar versión')}
                onClick={() => onClone?.(version)}
              />
            )}
            {showPublish && (
              <ActionButton
                icon={<Send size={18} />}
                label={t('templates.versions.actions.publishNow', 'Publish Now')}
                onClick={() => onPublish?.(version)}
              />
            )}
            {showSchedule && (
              <ActionButton
                icon={<Calendar size={18} />}
                label={t('templates.versions.actions.schedule', 'Schedule')}
                onClick={() => onSchedule?.(version)}
              />
            )}
            {showCancelSchedule && (
              <ActionButton
                icon={<XCircle size={18} />}
                label={t('templates.versions.actions.cancelSchedule', 'Cancel Schedule')}
                onClick={() => onCancelSchedule?.(version)}
              />
            )}
            {showArchive && (
              <ActionButton
                icon={<Archive size={18} />}
                label={t('templates.versions.actions.archive', 'Archive')}
                onClick={() => onArchive?.(version)}
              />
            )}
            {showDelete && (
              <ActionButton
                icon={<Trash2 size={18} />}
                label={t('templates.versions.actions.delete', 'Delete')}
                onClick={() => onDelete?.(version)}
                variant="destructive"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
