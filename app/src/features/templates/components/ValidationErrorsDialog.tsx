import { useTranslation } from 'react-i18next'
import { X, XCircle, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ValidationError {
  code: string
  path: string
  message: string
}

export interface ValidationResponse {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

interface ValidationErrorsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validation: ValidationResponse | null
  onOpenEditor?: () => void
}

export function ValidationErrorsDialog({
  open,
  onOpenChange,
  validation,
  onOpenEditor,
}: ValidationErrorsDialogProps) {
  const { t } = useTranslation()

  if (!validation) return null

  const hasErrors = validation.errors && validation.errors.length > 0
  const hasWarnings = validation.warnings && validation.warnings.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-destructive">
              {t('templates.validationDialog.title', 'Validation Errors')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'templates.validationDialog.description',
                'Cannot publish version due to content errors'
              )}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto p-6">
          {/* Errors Section */}
          {hasErrors && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2 text-destructive">
                <XCircle size={16} />
                <span className="font-mono text-xs font-medium uppercase tracking-widest">
                  {t('templates.validationDialog.errors', 'Errors')} ({validation.errors.length})
                </span>
              </div>
              <div className="space-y-3">
                {validation.errors.map((error, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-destructive bg-destructive/5 py-2 pl-3 pr-2"
                  >
                    <p className="text-sm text-foreground">{error.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {error.path}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {hasWarnings && (
            <div>
              <div className="mb-3 flex items-center gap-2 text-warning">
                <AlertTriangle size={16} />
                <span className="font-mono text-xs font-medium uppercase tracking-widest">
                  {t('templates.validationDialog.warnings', 'Warnings')} ({validation.warnings.length})
                </span>
              </div>
              <div className="space-y-3">
                {validation.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-warning-border bg-warning-muted/50 py-2 pl-3 pr-2"
                  >
                    <p className="text-sm text-foreground">{warning.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {warning.path}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {t('common.close', 'Close')}
          </button>
          {onOpenEditor && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onOpenEditor()
              }}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              {t('templates.validationDialog.openEditor', 'Open in Editor')}
            </button>
          )}
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
