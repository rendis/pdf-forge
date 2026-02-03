import { useTranslation } from 'react-i18next'
import { Folder as FolderIcon, MoreVertical, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FolderContextMenu } from './FolderContextMenu'
import { useFolderSelection } from '../context/FolderSelectionContext'
import type { Folder } from '@/types/api'

interface FolderCardProps {
  folder: Folder
  onClick?: () => void
  onRename?: () => void
  onMove?: () => void
  onDelete?: () => void
}

export function FolderCard({
  folder,
  onClick,
  onRename,
  onMove,
  onDelete,
}: FolderCardProps) {
  const { t } = useTranslation()
  const { isSelecting, isSelected, toggleSelection } = useFolderSelection()
  const selected = isSelected(folder.id)

  const handleClick = () => {
    if (isSelecting) {
      toggleSelection(folder.id)
    } else {
      onClick?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-8 border border-border bg-background p-6 transition-colors hover:border-foreground',
        selected && 'border-primary bg-primary/5'
      )}
    >
      {/* Selection checkbox */}
      {isSelecting && (
        <div
          className={cn(
            'absolute left-3 top-3 flex h-5 w-5 items-center justify-center border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground'
          )}
        >
          {selected && <Check size={14} />}
        </div>
      )}

      <div className="flex items-start justify-between">
        <FolderIcon
          className="text-muted-foreground transition-colors group-hover:text-foreground"
          size={32}
          strokeWidth={1}
        />

        {!isSelecting && (onRename || onMove || onDelete) && (
          <FolderContextMenu
            onRename={() => onRename?.()}
            onMove={() => onMove?.()}
            onDelete={() => onDelete?.()}
          >
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="Folder options"
            >
              <MoreVertical size={20} />
            </button>
          </FolderContextMenu>
        )}
      </div>

      <div>
        <h3 className="mb-1 font-display text-lg font-medium text-foreground decoration-1 underline-offset-4 group-hover:underline">
          {folder.name}
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {folder.childFolderCount > 0 && (
            <span>
              {folder.childFolderCount}{' '}
              {t('folders.stats.folders', {
                count: folder.childFolderCount,
                defaultValue: folder.childFolderCount === 1 ? 'folder' : 'folders',
              })}
            </span>
          )}
          {folder.childFolderCount > 0 && folder.templateCount > 0 && (
            <span className="mx-1">·</span>
          )}
          {folder.templateCount > 0 && (
            <span>
              {folder.templateCount}{' '}
              {t('folders.stats.templates', {
                count: folder.templateCount,
                defaultValue: folder.templateCount === 1 ? 'template' : 'templates',
              })}
            </span>
          )}
          {folder.childFolderCount === 0 && folder.templateCount === 0 && (
            <span>{t('folders.stats.empty', 'Empty')}</span>
          )}
        </p>
      </div>
    </div>
  )
}
