import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import {
    Archive,
    Calendar,
    CalendarCheck,
    CalendarClock,
    ClipboardCopy,
    Clock,
    Copy,
    ExternalLink,
    Loader2,
    Pencil,
    Send,
    Trash2,
    XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  onRename?: (version: TemplateVersionSummaryResponse, newName: string) => Promise<void>
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
  onRename,
  isHighlighted = false,
}: VersionListItemProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(version.name)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canRename = version.status === 'DRAFT' && !!onRename

  useEffect(() => {
    if (!isEditing && !isSaving) {
      setEditValue(version.name)
    }
  }, [version.name, isEditing, isSaving])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === version.name) {
      setEditValue(version.name)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setIsEditing(false)
    try {
      await onRename?.(version, trimmed)
    } catch {
      setEditValue(version.name)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(version.name)
      setIsEditing(false)
    }
  }

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSaving) {
      setIsEditing(true)
    }
  }

  const showPublish = version.status === 'DRAFT' || version.status === 'SCHEDULED'
  const showSchedule = version.status === 'DRAFT'
  const showCancelSchedule = version.status === 'SCHEDULED'
  const showArchive = version.status === 'PUBLISHED'
  const showDelete = version.status === 'DRAFT'
  const showClone = !!onClone // Always visible if handler is provided

  return (
    <div
      onClick={() => !isEditing && onOpenEditor(version.id)}
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
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                maxLength={100}
                className="w-full bg-transparent font-medium text-foreground border-b-2 border-primary outline-none"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{version.name}</span>
                {canRename && !isSaving && (
                  <button onClick={handleStartEditing} className="shrink-0">
                    <Pencil
                      size={14}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                    />
                  </button>
                )}
                {isSaving && (
                  <Loader2 size={14} className="shrink-0 animate-spin text-muted-foreground" />
                )}
                <ExternalLink
                  size={14}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            )}
            {version.description && !isEditing && (
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

        {/* Action buttons - copy ID always visible, others conditional */}
        <div className="flex items-center gap-1">
            <ActionButton
              icon={<ClipboardCopy size={18} />}
              label={t('templates.versions.actions.copyId', 'Copy Version ID')}
              onClick={async () => {
                await navigator.clipboard.writeText(version.id)
                toast({
                  description: t('templates.versions.idCopied', 'Version ID copied to clipboard'),
                })
              }}
            />
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
      </div>
    </div>
  )
}
