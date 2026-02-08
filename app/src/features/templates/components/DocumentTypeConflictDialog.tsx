import { AlertTriangle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface DocumentTypeConflictDialogProps {
  open: boolean
  conflictTemplate: { id: string; title: string } | null
  onCancel: () => void
  onForce: () => void
  isLoading?: boolean
}

export function DocumentTypeConflictDialog({
  open,
  conflictTemplate,
  onCancel,
  onForce,
  isLoading = false,
}: DocumentTypeConflictDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.documentType.conflictTitle', 'Document type in use')}
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
              'templates.documentType.conflictDescription',
              'This document type is already assigned to "{{title}}". Do you want to replace it? The type will be removed from the other template.',
              { title: conflictTemplate?.title }
            )}
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onForce}
            disabled={isLoading}
            className="rounded-none bg-primary px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading
              ? t('common.loading', 'Loading...')
              : t('templates.documentType.replace', 'Replace')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
