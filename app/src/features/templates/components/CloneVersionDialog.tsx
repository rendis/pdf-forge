import { BaseDialogContent, Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAppContextStore } from '@/stores/app-context-store'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCloneVersion } from '../hooks/useTemplateDetail'

interface CloneVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string
  sourceVersion: TemplateVersionSummaryResponse | null
}

export function CloneVersionDialog({
  open,
  onOpenChange,
  templateId,
  sourceVersion,
}: CloneVersionDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const cloneVersion = useCloneVersion(templateId)

  // Handle dialog open state change and reset form
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setName('')
      setDescription('')
      setIsSubmitting(false)
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !currentWorkspace || !sourceVersion || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await cloneVersion.mutateAsync({
        sourceVersionId: sourceVersion.id,
        name: name.trim(),
        description: description.trim() || undefined,
      })

      onOpenChange(false)

      // Navigate to the editor with the new version
      navigate({
        to: '/workspace/$workspaceId/editor/$templateId/version/$versionId',
        params: {
          workspaceId: currentWorkspace.id,
          templateId,
          versionId: response.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
        } as any,
      })
    } catch {
      setIsSubmitting(false)
    }
  }

  if (!sourceVersion) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('templates.cloneVersionDialog.title', 'Clonar Versión')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'templates.cloneVersionDialog.description',
                'Crear una nueva versión a partir de {{versionName}}',
                { versionName: sourceVersion.name }
              )}
            </DialogDescription>
            <div className="mt-2 text-xs text-muted-foreground">
              {t(
                'templates.cloneVersionDialog.sourceVersion',
                'Versión origen: v{{versionNumber}} - {{versionName}}',
                {
                  versionNumber: sourceVersion.versionNumber,
                  versionName: sourceVersion.name,
                }
              )}
            </div>
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
              <label
                htmlFor="clone-version-name"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('templates.createVersionDialog.nameLabel', 'Version Name')}
              </label>
              <input
                id="clone-version-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  'templates.createVersionDialog.namePlaceholder',
                  'e.g., Initial Draft, Review Changes...'
                )}
                maxLength={100}
                autoFocus
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="clone-version-description"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('templates.createVersionDialog.descriptionLabel', 'Description')}
                <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                  ({t('common.optional', 'optional')})
                </span>
              </label>
              <textarea
                id="clone-version-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  'templates.createVersionDialog.descriptionPlaceholder',
                  'Optional description of changes...'
                )}
                rows={3}
                className="w-full resize-none rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>
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
              disabled={!name.trim() || isSubmitting}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isSubmitting
                ? t('common.creating', 'Creando...')
                : t('templates.cloneVersionDialog.submit', 'Clonar Versión')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
