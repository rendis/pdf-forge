import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import axios from 'axios'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Workspace } from '@/features/workspaces/types'
import {
  useCreateWorkspace,
  useUpdateWorkspace,
} from '@/features/workspaces/hooks/useWorkspaces'
import { useToast } from '@/components/ui/use-toast'
import { useAppContextStore } from '@/stores/app-context-store'

const CODE_REGEX = /^[A-Z0-9]+(_[A-Z0-9]+)*$/

function normalizeCodeWhileTyping(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
}

function cleanCodeForSubmit(value: string): string {
  return value.replace(/^_+|_+$/g, '')
}

interface WorkspaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  workspace?: Workspace | null
}

export function WorkspaceFormDialog({
  open,
  onOpenChange,
  mode,
  workspace,
}: WorkspaceFormDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentWorkspace } = useAppContextStore()

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')

  const createMutation = useCreateWorkspace()
  const updateMutation = useUpdateWorkspace()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Reset form when dialog opens/closes or workspace changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && workspace) {
        setCode(workspace.code)
        setName(workspace.name)
      } else {
        setCode('')
        setName('')
      }
      setCodeError('')
      setNameError('')
    }
  }, [open, mode, workspace])

  const handleCodeBlur = () => {
    setCode(cleanCodeForSubmit(code))
  }

  const validateForm = (): boolean => {
    let isValid = true

    const cleanedCode = cleanCodeForSubmit(code)
    if (!cleanedCode) {
      setCodeError(t('administration.workspaces.form.codeRequired', 'Code is required'))
      isValid = false
    } else if (cleanedCode.length < 2 || cleanedCode.length > 50) {
      setCodeError(t('administration.workspaces.form.codeLength', 'Code must be 2-10 characters'))
      isValid = false
    } else if (!CODE_REGEX.test(cleanedCode)) {
      setCodeError(t('administration.workspaces.form.codeInvalid', 'Code must contain only letters, numbers, and underscores'))
      isValid = false
    } else {
      setCodeError('')
    }

    if (!name.trim()) {
      setNameError(t('administration.workspaces.form.nameRequired', 'Name is required'))
      isValid = false
    } else if (name.trim().length < 3) {
      setNameError(t('administration.workspaces.form.nameTooShort', 'Name must be at least 3 characters'))
      isValid = false
    } else if (name.length > 255) {
      setNameError(t('administration.workspaces.form.nameTooLong', 'Name must be 255 characters or less'))
      isValid = false
    } else {
      setNameError('')
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const finalCode = cleanCodeForSubmit(code)

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          code: finalCode,
          name: name.trim(),
          type: 'CLIENT', // Always CLIENT for user-created workspaces
        })
        toast({
          title: t('administration.workspaces.form.createSuccess', 'Workspace created'),
        })
      } else if (workspace) {
        // The update endpoint operates on /workspace (current workspace context)
        // so we can only update the workspace if it matches the current context
        if (currentWorkspace?.id === workspace.id) {
          await updateMutation.mutateAsync({
            code: finalCode,
            name: name.trim(),
          })
          toast({
            title: t('administration.workspaces.form.updateSuccess', 'Workspace updated'),
          })
        } else {
          toast({
            variant: 'destructive',
            title: t('common.error', 'Error'),
            description: t('administration.workspaces.form.editContextError', 'Cannot edit workspace outside its context'),
          })
          return
        }
      }
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setCodeError(t('administration.workspaces.form.codeExists', 'A workspace with this code already exists'))
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t('administration.workspaces.form.saveError', 'Failed to save workspace'),
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {mode === 'create'
                ? t('administration.workspaces.form.createTitle', 'Create Workspace')
                : t('administration.workspaces.form.editTitle', 'Edit Workspace')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {mode === 'create'
                ? t('administration.workspaces.form.createDescription', 'Create a new workspace for this tenant.')
                : t('administration.workspaces.form.editDescription', 'Update workspace details.')}
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
            {/* Name field */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('administration.workspaces.form.name', 'Name')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError('')
                }}
                placeholder={t('administration.workspaces.form.namePlaceholder', 'Workspace name')}
                className={cn(
                  'w-full rounded-none border-0 border-b bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0',
                  nameError ? 'border-destructive' : 'border-border'
                )}
                disabled={isLoading}
                autoFocus
              />
              <p className={cn('mt-1 text-xs', nameError ? 'text-destructive' : 'text-transparent')}>
                {nameError || '\u00A0'}
              </p>
            </div>

            {/* Code field */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('administration.workspaces.form.code', 'Code')} *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(normalizeCodeWhileTyping(e.target.value))
                  setCodeError('')
                }}
                onBlur={handleCodeBlur}
                placeholder={t('administration.workspaces.form.codePlaceholder', 'WS_CODE')}
                className={cn(
                  'w-full rounded-none border-0 border-b bg-transparent py-2 font-mono text-base uppercase text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0',
                  codeError ? 'border-destructive' : 'border-border'
                )}
                disabled={isLoading}
                maxLength={50}
              />
              <p className={cn('mt-1 text-xs', codeError ? 'text-destructive' : 'text-muted-foreground')}>
                {codeError || t('administration.workspaces.form.codeHelper', '2-50 uppercase characters')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              disabled={isLoading}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'create'
                ? t('common.create', 'Create')
                : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
