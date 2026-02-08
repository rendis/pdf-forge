import { useState, useCallback } from 'react'
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

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignableRoles: string[]
  onSubmit: (data: { email: string; fullName: string; role: string }) => Promise<void>
  title?: string
  description?: string
}

export function AddMemberDialog({
  open,
  onOpenChange,
  assignableRoles,
  onSubmit,
  title,
  description,
}: AddMemberDialogProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState(assignableRoles[0] ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setEmail('')
        setFullName('')
        setRole(assignableRoles[0] ?? '')
        setError(null)
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, assignableRoles]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim() || !role) return
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ email: email.trim(), fullName: fullName.trim(), role })
      handleOpenChange(false)
    } catch (err) {
      setError(getMemberErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {title ?? t('members.add.title', 'Add Member')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {description ?? t('members.add.description', 'Add a user by email and assign a role.')}
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
            {/* Email */}
            <div>
              <label
                htmlFor="member-email"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('members.add.email', 'Email')}
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                autoFocus
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="member-fullname"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('members.add.fullName', 'Full Name')}
              </label>
              <input
                id="member-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('members.add.role', 'Role')}
              </label>
              <Select value={role} onValueChange={setRole}>
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
              {role && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(`members.roleDescriptions.${role}`, '')}
                </p>
              )}
            </div>

            <p className={`min-h-[20px] text-sm text-destructive ${error ? 'visible' : 'invisible'}`}>{error ?? '\u00A0'}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!email.trim() || !role || isSubmitting}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isSubmitting
                ? t('common.processing', 'Processing...')
                : t('members.add.submit', 'Add Member')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
