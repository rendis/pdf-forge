import { useTranslation } from 'react-i18next'
import { FolderInput } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Folder } from '@/types/api'

interface ConfirmMoveFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: Folder | null
  targetFolderName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmMoveFolderDialog({
  open,
  onOpenChange,
  folder,
  targetFolderName,
  onConfirm,
  isLoading = false,
}: ConfirmMoveFolderDialogProps) {
  const { t } = useTranslation()

  const folderDisplayName =
    targetFolderName || t('folders.moveDialog.root', 'Root (No parent)')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-primary" />
            {t('folders.confirmMoveDialog.title', 'Move Folder')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'folders.confirmMoveDialog.message',
              'Are you sure you want to move "{{name}}" to "{{folder}}"?',
              {
                name: folder?.name ?? '',
                folder: folderDisplayName,
              }
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading
              ? t('common.moving', 'Moving...')
              : t('common.move', 'Move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
