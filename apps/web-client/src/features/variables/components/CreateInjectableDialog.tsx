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
import { useCreateWorkspaceInjectable } from '../hooks/useWorkspaceInjectables'
import { InjectableForm } from './InjectableForm'

interface CreateInjectableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
}

export function CreateInjectableDialog({
  open,
  onOpenChange,
}: CreateInjectableDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [description, setDescription] = useState('')
  const createInjectable = useCreateWorkspaceInjectable()

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setKey('')
        setLabel('')
        setDefaultValue('')
        setDescription('')
      }
      onOpenChange(isOpen)
    },
    [onOpenChange]
  )

  function handleLabelChange(value: string): void {
    setLabel(value)
    if (!key || key === toSnakeCase(label)) {
      setKey(toSnakeCase(value))
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!key.trim() || !label.trim() || !defaultValue.trim()) return

    try {
      await createInjectable.mutateAsync({
        key: key.trim(),
        label: label.trim(),
        defaultValue: defaultValue.trim(),
        description: description.trim() || undefined,
      })
      handleOpenChange(false)
    } catch {
      // Error is handled by mutation
    }
  }

  const isValid =
    key.trim().length > 0 &&
    label.trim().length > 0 &&
    defaultValue.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BaseDialogContent className="max-w-md">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('variables.createDialog.title', 'New Variable')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'variables.createDialog.description',
                'Create a new variable to use in templates'
              )}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <InjectableForm
            keyValue={key}
            onKeyChange={setKey}
            label={label}
            onLabelChange={handleLabelChange}
            defaultValue={defaultValue}
            onDefaultValueChange={setDefaultValue}
            description={description}
            onDescriptionChange={setDescription}
            idPrefix="injectable"
          />

          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={createInjectable.isPending}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || createInjectable.isPending}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {createInjectable.isPending
                ? t('common.creating', 'Creating...')
                : t('variables.createDialog.submit', 'Create Variable')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
