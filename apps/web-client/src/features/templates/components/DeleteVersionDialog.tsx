import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import { Dialog, BaseDialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useDeleteVersion } from '../hooks/useTemplateDetail'
import type { TemplateVersionSummaryResponse } from '@/types/api'

interface DeleteVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
}

export function DeleteVersionDialog({
  open,
  onOpenChange,
  version,
  templateId,
}: DeleteVersionDialogProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteVersion = useDeleteVersion(templateId)

  const handleDelete = async () => {
    if (!version || isDeleting) return

    setIsDeleting(true)

    try {
      await deleteVersion.mutateAsync(version.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.versionDeleteDialog.title', 'Delete Version')}
              </DialogTitle>
            </div>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="p-6">
          <DialogDescription className="text-sm font-light text-muted-foreground">
            {t(
              'templates.versionDeleteDialog.message',
              'Are you sure you want to delete version {{version}}? This action cannot be undone.',
              { version: version?.versionNumber ?? '' }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting
              ? t('common.deleting', 'Deleting...')
              : t('templates.versionDeleteDialog.confirm', 'Delete')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
