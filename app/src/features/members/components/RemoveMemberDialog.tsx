import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getMemberErrorMessage } from '../utils/member-errors'

interface RemoveMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: () => Promise<void>
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
}: RemoveMemberDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(getMemberErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
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
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('members.remove.title', 'Remove Member')}
            </DialogTitle>
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
              'members.remove.confirm',
              'Are you sure you want to remove {{name}}? This action cannot be undone.',
              { name: memberName }
            )}
          </DialogDescription>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isSubmitting
              ? t('common.processing', 'Processing...')
              : t('members.remove.submit', 'Remove')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
