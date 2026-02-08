import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteFolder, useDeleteFolders } from '../hooks/useFolders'

interface DeleteFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderIds: string[]
  folderNames?: string[]
  onSuccess?: () => void
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderIds,
  folderNames = [],
  onSuccess,
}: DeleteFolderDialogProps) {
  const { t } = useTranslation()
  const deleteFolder = useDeleteFolder()
  const deleteFolders = useDeleteFolders()

  const isSingle = folderIds.length === 1
  const isPending = deleteFolder.isPending || deleteFolders.isPending

  const handleDelete = async () => {
    if (folderIds.length === 0) return

    try {
      if (isSingle && folderIds[0]) {
        await deleteFolder.mutateAsync(folderIds[0])
      } else {
        await deleteFolders.mutateAsync(folderIds)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error is handled by mutation
    }
  }

  const displayName = isSingle
    ? folderNames[0] || t('folders.deleteDialog.thisFolder', 'this folder')
    : t('folders.deleteDialog.multipleFolders', '{{count}} folders', {
        count: folderIds.length,
      })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('folders.deleteDialog.title', 'Delete Folder')}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>
              {t(
                'folders.deleteDialog.confirmMessage',
                'Are you sure you want to delete {{name}}?',
                { name: displayName }
              )}
            </span>
            <span className="block text-destructive">
              {t(
                'folders.deleteDialog.warning',
                'This will also delete all subfolders and documents inside. This action cannot be undone.'
              )}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending
              ? t('common.deleting', 'Deleting...')
              : t('common.delete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
