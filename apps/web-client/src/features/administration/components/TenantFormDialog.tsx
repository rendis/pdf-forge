import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SystemTenant } from '@/features/system-injectables/api/system-tenants-api'
import {
  useCreateTenant,
  useUpdateTenant,
} from '@/features/system-injectables/hooks/useSystemTenants'
import { useToast } from '@/components/ui/use-toast'
import { useAppContextStore } from '@/stores/app-context-store'
import axios from 'axios'

interface TenantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  tenant?: SystemTenant | null
}

// Validates: alphanumeric segments separated by single underscores
// Valid: CODE, CODE_V2, MY_CODE_123
// Invalid: _CODE, CODE_, __CODE, CODE__V2
const CODE_REGEX = /^[A-Z0-9]+(_[A-Z0-9]+)*$/

/**
 * Normalizes code input while typing:
 * - Converts to uppercase
 * - Replaces spaces with underscores
 * - Removes special characters (keeps only A-Z, 0-9, _)
 * - Collapses consecutive underscores to one
 */
function normalizeCodeWhileTyping(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
}

/**
 * Final cleanup for submission:
 * - Removes leading and trailing underscores
 */
function cleanCodeForSubmit(value: string): string {
  return value.replace(/^_+|_+$/g, '')
}

export function TenantFormDialog({
  open,
  onOpenChange,
  mode,
  tenant,
}: TenantFormDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')

  const createMutation = useCreateTenant()
  const updateMutation = useUpdateTenant()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Reset form when dialog opens/closes or tenant changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && tenant) {
        setName(tenant.name)
        setCode(tenant.code)
        setDescription(tenant.description || '')
      } else {
        setName('')
        setCode('')
        setDescription('')
      }
      setNameError('')
      setCodeError('')
    }
  }, [open, mode, tenant])

  const validateForm = (): boolean => {
    let isValid = true

    if (!name.trim()) {
      setNameError(t('administration.tenants.form.nameRequired', 'Name is required'))
      isValid = false
    } else if (name.length > 100) {
      setNameError(t('administration.tenants.form.nameTooLong', 'Name must be 100 characters or less'))
      isValid = false
    } else {
      setNameError('')
    }

    if (mode === 'create') {
      const cleanedCode = cleanCodeForSubmit(code)
      if (!cleanedCode) {
        setCodeError(t('administration.tenants.form.codeRequired', 'Code is required'))
        isValid = false
      } else if (cleanedCode.length < 2 || cleanedCode.length > 10) {
        setCodeError(t('administration.tenants.form.codeLength', 'Code must be 2-10 characters'))
        isValid = false
      } else if (!CODE_REGEX.test(cleanedCode)) {
        setCodeError(t('administration.tenants.form.codeInvalid', 'Code must contain only letters, numbers, and underscores'))
        isValid = false
      } else {
        setCodeError('')
      }
    }

    return isValid
  }

  const handleCodeBlur = () => {
    const cleaned = cleanCodeForSubmit(code)
    if (cleaned !== code) {
      setCode(cleaned)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCode = cleanCodeForSubmit(code)
    if (finalCode !== code) {
      setCode(finalCode)
    }

    if (!validateForm()) return

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: finalCode,
          description: description.trim() || undefined,
        })
        toast({
          title: t('administration.tenants.form.createSuccess', 'Tenant created'),
        })
        // Now there are multiple tenants — breadcrumb should be clickable
        useAppContextStore.getState().setSingleTenant(false)
      } else if (tenant) {
        await updateMutation.mutateAsync({
          id: tenant.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        })
        toast({
          title: t('administration.tenants.form.updateSuccess', 'Tenant updated'),
        })
      }
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setCodeError(t('administration.tenants.form.codeExists', 'A tenant with this code already exists'))
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t('administration.tenants.form.saveError', 'Failed to save tenant'),
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('administration.tenants.form.createTitle', 'Create Tenant')
              : t('administration.tenants.form.editTitle', 'Edit Tenant')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('administration.tenants.form.createDescription', 'Create a new tenant organization.')
              : t('administration.tenants.form.editDescription', 'Update tenant details.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.tenants.form.name', 'Name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError('')
              }}
              placeholder={t('administration.tenants.form.namePlaceholder', 'Tenant name')}
              className={cn(
                'w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground',
                nameError ? 'border-destructive' : 'border-border'
              )}
              disabled={isLoading}
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>

          {/* Code field - only in create mode */}
          {mode === 'create' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t('administration.tenants.form.code', 'Code')} *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(normalizeCodeWhileTyping(e.target.value))
                  setCodeError('')
                }}
                onBlur={handleCodeBlur}
                placeholder={t('administration.tenants.form.codePlaceholder', 'TENANT_CODE')}
                className={cn(
                  'w-full rounded-sm border bg-transparent px-3 py-2 text-sm font-mono uppercase outline-none transition-colors focus:border-foreground',
                  codeError ? 'border-destructive' : 'border-border'
                )}
                disabled={isLoading}
              />
              {codeError && (
                <p className="mt-1 text-xs text-destructive">{codeError}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t('administration.tenants.form.codeHint', '2-10 uppercase characters')}
              </p>
            </div>
          )}

          {/* Code display in edit mode */}
          {mode === 'edit' && tenant && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t('administration.tenants.form.code', 'Code')}
              </label>
              <div className="rounded-sm border border-border bg-muted px-3 py-2">
                <span className="font-mono text-sm uppercase">{tenant.code}</span>
              </div>
            </div>
          )}

          {/* Description field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.tenants.form.description', 'Description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('administration.tenants.form.descriptionPlaceholder', 'Optional description')}
              rows={3}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              disabled={isLoading}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'create'
                ? t('common.create', 'Create')
                : t('common.save', 'Save')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
