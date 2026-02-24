import { BaseDialogContent, Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStageVersion } from '../hooks/useTemplateDetail'

interface StageVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
}

export function StageVersionDialog({
  open,
  onOpenChange,
  version,
  templateId,
}: StageVersionDialogProps) {
  const { t } = useTranslation()
  const [isStaging, setIsStaging] = useState(false)
  const stageVersion = useStageVersion(templateId)

  const handleStage = async () => {
    if (!version || isStaging) return

    setIsStaging(true)

    try {
      await stageVersion.mutateAsync(version.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsStaging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-purple-500/10">
              <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.stageDialog.title', 'Stage Version')}
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
              'templates.stageDialog.message',
              'Send version v{{version}} to staging? If another version is currently staged, it will be automatically unstaged.',
              { version: version?.versionNumber ?? '' }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isStaging}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleStage}
            disabled={isStaging}
            className="rounded-none bg-purple-600 px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {isStaging
              ? t('common.staging', 'Staging...')
              : t('templates.stageDialog.confirm', 'Stage')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
