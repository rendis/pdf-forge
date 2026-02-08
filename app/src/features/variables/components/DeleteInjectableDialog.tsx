import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useDeleteWorkspaceInjectable } from '../hooks/useWorkspaceInjectables'
import type { WorkspaceInjectable } from '../types'

interface DeleteInjectableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  injectable: WorkspaceInjectable | null
}

export function DeleteInjectableDialog({
  open,
  onOpenChange,
  injectable,
}: DeleteInjectableDialogProps) {
  const { t } = useTranslation()
  const deleteInjectable = useDeleteWorkspaceInjectable()

  async function handleDelete(): Promise<void> {
    if (!injectable || deleteInjectable.isPending) return

    try {
      await deleteInjectable.mutateAsync(injectable.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('variables.deleteDialog.title', 'Delete Variable')}
            </DialogTitle>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="p-6">
          <DialogDescription className="text-sm font-light text-muted-foreground">
            {t(
              'variables.deleteDialog.message',
              'Are you sure you want to delete the variable "{{name}}"? This action cannot be undone.',
              { name: injectable?.label ?? '' }
            )}
          </DialogDescription>
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleteInjectable.isPending}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteInjectable.isPending}
            className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {deleteInjectable.isPending
              ? t('common.deleting', 'Deleting...')
              : t('common.delete', 'Delete')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
