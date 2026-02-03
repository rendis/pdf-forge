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
import type { TemplateListItem } from '@/types/api'

interface MoveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateListItem | null
  targetFolderName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function MoveTemplateDialog({
  open,
  onOpenChange,
  template,
  targetFolderName,
  onConfirm,
  isLoading = false,
}: MoveTemplateDialogProps) {
  const { t } = useTranslation()

  const folderDisplayName =
    targetFolderName || t('templates.moveDialog.toRoot', 'Root')

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-primary" />
            {t('templates.moveDialog.title', 'Move Template')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'templates.moveDialog.message',
              'Are you sure you want to move "{{name}}" to "{{folder}}"?',
              {
                name: template?.title ?? '',
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
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading
              ? t('common.moving', 'Moving...')
              : t('common.move', 'Move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
