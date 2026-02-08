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
import type { SystemTenant } from '@/features/system-injectables/api/system-tenants-api'
import { useUpdateTenantStatus } from '@/features/system-injectables/hooks/useSystemTenants'
import { useToast } from '@/components/ui/use-toast'

interface ArchiveTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: SystemTenant | null
}

export function ArchiveTenantDialog({
  open,
  onOpenChange,
  tenant,
}: ArchiveTenantDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const updateStatusMutation = useUpdateTenantStatus()
  const isLoading = updateStatusMutation.isPending

  const handleArchive = async () => {
    if (!tenant) return

    try {
      await updateStatusMutation.mutateAsync({
        id: tenant.id,
        status: 'ARCHIVED',
      })
      toast({
        title: t('administration.tenants.archive.success', 'Tenant archived'),
      })
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.tenants.archive.error', 'Failed to archive tenant'),
      })
    }
  }

  if (!tenant) return <></>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('administration.tenants.archive.title', 'Archive Tenant')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.tenants.archive.confirm',
              'Are you sure you want to archive "{{name}}"?',
              { name: tenant.name }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t(
              'administration.tenants.archive.description',
              'This will hide the tenant from all users. The data will be preserved and can be restored by an administrator.'
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
