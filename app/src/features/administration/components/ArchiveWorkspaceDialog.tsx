import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Workspace } from '@/features/workspaces/types'
import { useUpdateWorkspaceStatus } from '@/features/workspaces/hooks/useWorkspaces'
import { useToast } from '@/components/ui/use-toast'

interface ArchiveWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace | null
}

export function ArchiveWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
}: ArchiveWorkspaceDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const updateStatusMutation = useUpdateWorkspaceStatus()
  const isLoading = updateStatusMutation.isPending

  const handleArchive = async () => {
    if (!workspace) return

    try {
      await updateStatusMutation.mutateAsync({
        id: workspace.id,
        status: 'ARCHIVED',
      })
      toast({
        title: t('administration.workspaces.archive.success', 'Workspace archived'),
      })
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.workspaces.archive.error', 'Failed to archive workspace'),
      })
    }
  }

  if (!workspace) return <></>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('administration.workspaces.archive.title', 'Archive Workspace')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.workspaces.archive.confirm',
              'Are you sure you want to archive "{{name}}"?',
              { name: workspace.name }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-sm border border-warning-border bg-warning-muted p-3">
            <p className="text-sm text-warning-foreground">
              {t(
                'administration.workspaces.archive.warning',
                'This workspace may contain templates and documents that will become inaccessible.'
              )}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              'administration.workspaces.archive.description',
              'Archiving will hide this workspace from all users. The data will be preserved and can be restored by an administrator.'
            )}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="inline-flex items-center gap-2 rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {t('common.archive', 'Archive')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
