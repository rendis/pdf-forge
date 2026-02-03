import { useTranslation } from 'react-i18next'
import { Pencil, Trash, FolderInput } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FolderContextMenuProps {
  children: React.ReactNode
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}

export function FolderContextMenu({
  children,
  onRename,
  onMove,
  onDelete,
}: FolderContextMenuProps) {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('folders.actions.rename', 'Rename')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMove}>
          <FolderInput className="mr-2 h-4 w-4" />
          {t('folders.actions.move', 'Move to...')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash className="mr-2 h-4 w-4" />
          {t('folders.actions.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
