import { useTranslation } from 'react-i18next'
import { X, Trash, FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFolderSelection } from '../context/FolderSelectionContext'

interface SelectionToolbarProps {
  onMove: () => void
  onDelete: () => void
  totalCount: number
  allFolderIds: string[]
}

export function SelectionToolbar({
  onMove,
  onDelete,
  totalCount,
  allFolderIds,
}: SelectionToolbarProps) {
  const { t } = useTranslation()
  const { selectedIds, stopSelecting, selectAll } = useFolderSelection()
  const count = selectedIds.size

  if (count === 0) return null

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={stopSelecting}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t('common.cancel', 'Cancel')}
        >
          <X size={20} />
        </button>
        <span className="font-mono text-sm text-muted-foreground">
          {t('folders.selection.count', '{{count}} selected', { count })}
        </span>
        {count < totalCount && (
          <button
            onClick={() => selectAll(allFolderIds)}
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('folders.selection.selectAll', 'Select All')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onMove}>
          <FolderInput className="mr-2 h-4 w-4" />
          {t('folders.actions.move', 'Move')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash className="mr-2 h-4 w-4" />
          {t('folders.actions.delete', 'Delete')}
        </Button>
      </div>
    </div>
  )
}
