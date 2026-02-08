import { BaseDialogContent, Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCancelSchedule } from '../hooks/useTemplateDetail'

interface CancelScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
}

export function CancelScheduleDialog({
  open,
  onOpenChange,
  version,
  templateId,
}: CancelScheduleDialogProps) {
  const { t } = useTranslation()
  const [isCancelling, setIsCancelling] = useState(false)
  const cancelSchedule = useCancelSchedule(templateId)

  const handleCancelSchedule = async () => {
    if (!version || isCancelling) return

    setIsCancelling(true)

    try {
      await cancelSchedule.mutateAsync(version.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsCancelling(false)
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
                {t('templates.versionCancelScheduleDialog.title', 'Cancel Scheduled Publication')}
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
              'templates.versionCancelScheduleDialog.message',
              'Are you sure you want to cancel the scheduled publication of version {{version}}?',
              { version: version?.versionNumber ?? '' }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleCancelSchedule}
            disabled={isCancelling}
            className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isCancelling
              ? t('common.cancelling', 'Cancelling...')
              : t('templates.versionCancelScheduleDialog.confirm', 'Cancel Schedule')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
