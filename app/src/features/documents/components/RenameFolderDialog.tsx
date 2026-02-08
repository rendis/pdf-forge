import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateFolder } from '../hooks/useFolders'
import type { Folder } from '@/types/api'

interface RenameFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: Folder | null
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  folder,
}: RenameFolderDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const updateFolder = useUpdateFolder()

  // Handle dialog open state change and reset form
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && folder) {
      setName(folder.name)
    }
    onOpenChange(isOpen)
  }, [onOpenChange, folder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !folder) return

    try {
      await updateFolder.mutateAsync({
        folderId: folder.id,
        data: { name: name.trim() },
      })
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    }
  }

  const hasChanged = folder && name.trim() !== folder.name

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('folders.renameDialog.title', 'Rename Folder')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'folders.renameDialog.description',
              'Enter a new name for this folder.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t('folders.renameDialog.nameLabel', 'Folder Name')}
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  'folders.renameDialog.namePlaceholder',
                  'Enter folder name...'
                )}
                maxLength={255}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !hasChanged || updateFolder.isPending}
            >
              {updateFolder.isPending
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
