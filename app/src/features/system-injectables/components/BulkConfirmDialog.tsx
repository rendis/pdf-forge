import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type BulkAction = 'activate' | 'deactivate' | 'make-public' | 'remove-public'

interface BulkConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: BulkAction | null
  selectedKeys: string[]
  onConfirm: () => void
  isPending: boolean
}

const ACTION_CONFIG: Record<
  BulkAction,
  {
    titleKey: string
    titleDefault: string
    descKey: string
    descDefault: string
    warningKey: string
    warningDefault: string
    confirmKey: string
    confirmDefault: string
    variant: 'success' | 'danger' | 'warning'
  }
> = {
  activate: {
    titleKey: 'systemInjectables.bulk.confirmActivate',
    titleDefault: 'Activate Injectables',
    descKey: 'systemInjectables.bulk.confirmActivateDescription',
    descDefault: 'The following {{count}} injectables will be activated globally:',
    warningKey: 'systemInjectables.bulk.warningActivate',
    warningDefault:
      'Activated injectables will be available for assignment to workspaces.',
    confirmKey: 'systemInjectables.bulk.activate',
    confirmDefault: 'Activate',
    variant: 'success',
  },
  deactivate: {
    titleKey: 'systemInjectables.bulk.confirmDeactivate',
    titleDefault: 'Deactivate Injectables',
    descKey: 'systemInjectables.bulk.confirmDeactivateDescription',
    descDefault: 'The following {{count}} injectables will be deactivated globally:',
    warningKey: 'systemInjectables.bulk.warningDeactivate',
    warningDefault:
      'Deactivated injectables will not be available in any workspace, regardless of their assignments.',
    confirmKey: 'systemInjectables.bulk.deactivate',
    confirmDefault: 'Deactivate',
    variant: 'danger',
  },
  'make-public': {
    titleKey: 'systemInjectables.bulk.confirmMakePublic',
    titleDefault: 'Make Injectables Public',
    descKey: 'systemInjectables.bulk.confirmMakePublicDescription',
    descDefault: 'The following {{count}} injectables will be made PUBLIC:',
    warningKey: 'systemInjectables.bulk.warningMakePublic',
    warningDefault:
      'PUBLIC injectables are available to ALL workspaces without explicit assignments.',
    confirmKey: 'systemInjectables.bulk.makePublic',
    confirmDefault: 'Make Public',
    variant: 'success',
  },
  'remove-public': {
    titleKey: 'systemInjectables.bulk.confirmRemovePublic',
    titleDefault: 'Remove Public Access',
    descKey: 'systemInjectables.bulk.confirmRemovePublicDescription',
    descDefault:
      'PUBLIC access will be removed from the following {{count}} injectables:',
    warningKey: 'systemInjectables.bulk.warningRemovePublic',
    warningDefault:
      'Removing PUBLIC access will restrict these injectables to their scoped assignments only.',
    confirmKey: 'systemInjectables.bulk.removePublic',
    confirmDefault: 'Remove Public',
    variant: 'danger',
  },
}

const VARIANT_STYLES = {
  success: {
    warning: 'border-warning-border bg-warning-muted',
    warningIcon: 'text-warning',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  danger: {
    warning: 'border-destructive/30 bg-destructive/10',
    warningIcon: 'text-destructive',
    button: 'bg-rose-600 text-white hover:bg-rose-700',
  },
  warning: {
    warning: 'border-warning-border bg-warning-muted',
    warningIcon: 'text-warning',
    button: 'bg-amber-600 text-white hover:bg-amber-700',
  },
}

export function BulkConfirmDialog({
  open,
  onOpenChange,
  action,
  selectedKeys,
  onConfirm,
  isPending,
}: BulkConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const count = selectedKeys.length

  const config = action ? ACTION_CONFIG[action] : null
  const styles = config ? VARIANT_STYLES[config.variant] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest">
            {config && t(config.titleKey, config.titleDefault)}
          </DialogTitle>
          <DialogDescription>
            {config && t(config.descKey, config.descDefault, { count })}
          </DialogDescription>
        </DialogHeader>

        {/* Keys List */}
        <div className="max-h-48 overflow-y-auto rounded-sm border border-border bg-muted/30 p-3">
          <ul className="space-y-1">
            {selectedKeys.map((key) => (
              <li key={key} className="font-mono text-xs text-muted-foreground">
                • {key}
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        {config && styles && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-sm border p-3',
              styles.warning
            )}
          >
            <AlertTriangle
              size={16}
              className={cn('mt-0.5 shrink-0', styles.warningIcon)}
            />
            <p className="text-xs text-muted-foreground">
              {t(config.warningKey, config.warningDefault)}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="font-mono text-xs uppercase"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={cn('font-mono text-xs uppercase', styles?.button)}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                {t('common.processing', 'Processing...')}
              </>
            ) : (
              config && t(config.confirmKey, config.confirmDefault)
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
