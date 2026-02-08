import { BaseDialogContent, Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useArchiveVersion } from '../hooks/useTemplateDetail'

interface ArchiveVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
}

export function ArchiveVersionDialog({
  open,
  onOpenChange,
  version,
  templateId,
}: ArchiveVersionDialogProps) {
  const { t } = useTranslation()
  const [isArchiving, setIsArchiving] = useState(false)
  const archiveVersion = useArchiveVersion(templateId)

  const handleArchive = async () => {
    if (!version || isArchiving) return

    setIsArchiving(true)

    try {
      await archiveVersion.mutateAsync(version.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsArchiving(false)
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
                {t('templates.versionArchiveDialog.title', 'Archive Version')}
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
              'templates.versionArchiveDialog.message',
              'Are you sure you want to archive version {{version}}? This action cannot be undone.',
              { version: version?.versionNumber ?? '' }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isArchiving}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isArchiving
              ? t('common.archiving', 'Archiving...')
              : t('templates.versionArchiveDialog.confirm', 'Archive')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
