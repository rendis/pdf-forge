import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getMemberErrorMessage } from '../utils/member-errors'
import { RoleBadge } from './RoleBadge'

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  currentRole: string
  assignableRoles: string[]
  onSubmit: (newRole: string) => Promise<void>
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  memberName,
  currentRole,
  assignableRoles,
  onSubmit,
}: ChangeRoleDialogProps) {
  const { t } = useTranslation()
  const [newRole, setNewRole] = useState(currentRole)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newRole === currentRole) return
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(newRole)
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
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('members.changeRole.title', 'Change Role')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t('members.changeRole.description', 'Update role for {{name}}.', { name: memberName })}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-6">
            {/* Current Role */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('members.changeRole.current', 'Current Role')}
              </label>
              <RoleBadge role={currentRole} />
            </div>

            {/* New Role */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('members.changeRole.new', 'New Role')}
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="rounded-none border-0 border-b border-border bg-transparent py-2 pl-1 text-base font-light shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem
                      key={r}
                      value={r}
                      description={t(`members.roleDescriptions.${r}`, '')}
                    >
                      {t(`members.roles.${r}`, r.replace(/_/g, ' '))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newRole && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(`members.roleDescriptions.${newRole}`, '')}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
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
              type="submit"
              disabled={newRole === currentRole || isSubmitting}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isSubmitting
                ? t('common.processing', 'Processing...')
                : t('members.changeRole.submit', 'Update Role')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
