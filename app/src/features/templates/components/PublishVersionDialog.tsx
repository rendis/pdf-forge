import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'

interface PublishVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  onConfirm: () => void
  isLoading?: boolean
}

export function PublishVersionDialog({
  open,
  onOpenChange,
  version,
  onConfirm,
  isLoading,
}: PublishVersionDialogProps) {
  const { t } = useTranslation()

  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('templates.publishDialog.title', 'Publish Version')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t('templates.publishDialog.description', 'Make version "{{name}}" live', {
                name: version.name,
              })}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex gap-3 rounded-md border border-warning-border bg-warning-muted p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <div className="text-sm text-warning-foreground">
              <p className="font-medium">
                {t('templates.publishDialog.warningTitle', 'This action will:')}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 opacity-80">
                <li>
                  {t(
                    'templates.publishDialog.warning1',
                    'Replace the current published version'
                  )}
                </li>
                <li>
                  {t(
                    'templates.publishDialog.warning2',
                    'Make this content immediately available'
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {isLoading
              ? t('common.publishing', 'Publishing...')
              : t('templates.publishDialog.confirm', 'Publish Now')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
