import { BaseDialogContent, Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnstageVersion } from '../hooks/useTemplateDetail'

interface UnstageVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
}

export function UnstageVersionDialog({
  open,
  onOpenChange,
  version,
  templateId,
}: UnstageVersionDialogProps) {
  const { t } = useTranslation()
  const [isUnstaging, setIsUnstaging] = useState(false)
  const unstageVersion = useUnstageVersion(templateId)

  const handleUnstage = async () => {
    if (!version || isUnstaging) return

    setIsUnstaging(true)

    try {
      await unstageVersion.mutateAsync(version.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsUnstaging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-warning-muted">
              <Undo2 className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.unstageDialog.title', 'Unstage Version')}
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
              'templates.unstageDialog.message',
              'Remove version v{{version}} from staging? It will return to Draft status.',
              { version: version?.versionNumber ?? '' }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isUnstaging}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleUnstage}
            disabled={isUnstaging}
            className="rounded-none border border-warning bg-warning-muted px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-warning-foreground transition-colors hover:bg-warning/20 disabled:opacity-50"
          >
            {isUnstaging
              ? t('common.unstaging', 'Unstaging...')
              : t('templates.unstageDialog.confirm', 'Unstage')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
