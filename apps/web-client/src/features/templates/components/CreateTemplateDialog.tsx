import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { useCreateTemplate, useAssignDocumentType } from '../hooks/useTemplates'
import { addTagsToTemplate, DocumentTypeConflictError } from '../api/templates-api'
import { useAppContextStore } from '@/stores/app-context-store'
import { TagSelector } from './TagSelector'
import { DocumentTypeSelector } from '@/features/administration/components/DocumentTypeSelector'
import { DocumentTypeConflictDialog } from './DocumentTypeConflictDialog'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId?: string | null
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  folderId,
}: CreateTemplateDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()
  const [title, setTitle] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean
    conflict: { id: string; title: string } | null
    pendingTemplateId: string | null
    pendingVersionId: string | null
  }>({ open: false, conflict: null, pendingTemplateId: null, pendingVersionId: null })
  const createTemplate = useCreateTemplate()
  const assignDocumentType = useAssignDocumentType()

  // Handle dialog open state change and reset form
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setTitle('')
      setSelectedTagIds([])
      setSelectedDocumentTypeId(null)
      setIsSubmitting(false)
      setConflictDialog({ open: false, conflict: null, pendingTemplateId: null, pendingVersionId: null })
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const navigateToTemplate = (templateId: string, versionId: string) => {
    if (!currentWorkspace) return
    onOpenChange(false)
    navigate({
      to: '/workspace/$workspaceId/editor/$templateId/version/$versionId',
      params: {
        workspaceId: currentWorkspace.id,
        templateId,
        versionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
      } as any,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !currentWorkspace || isSubmitting) return

    setIsSubmitting(true)

    try {
      // 1. Create the template
      const response = await createTemplate.mutateAsync({
        title: title.trim(),
        folderId: folderId ?? undefined,
        isPublicLibrary: false,
      })

      // 2. Add tags to the template (if any selected)
      if (selectedTagIds.length > 0) {
        await addTagsToTemplate(response.template.id, selectedTagIds)
      }

      // 3. Assign document type (if selected)
      if (selectedDocumentTypeId) {
        try {
          await assignDocumentType.mutateAsync({
            templateId: response.template.id,
            data: { documentTypeId: selectedDocumentTypeId },
          })
        } catch (error) {
          if (error instanceof DocumentTypeConflictError) {
            setConflictDialog({
              open: true,
              conflict: error.conflict,
              pendingTemplateId: response.template.id,
              pendingVersionId: response.initialVersion.id,
            })
            setIsSubmitting(false)
            return
          }
          throw error
        }
      }

      // 4. Navigate
      navigateToTemplate(response.template.id, response.initialVersion.id)
    } catch {
      // Error is handled by mutation
      setIsSubmitting(false)
    }
  }

  const handleForceAssignDocumentType = async () => {
    if (!conflictDialog.pendingTemplateId || !conflictDialog.pendingVersionId || !selectedDocumentTypeId) return
    setIsSubmitting(true)
    try {
      await assignDocumentType.mutateAsync({
        templateId: conflictDialog.pendingTemplateId,
        data: { documentTypeId: selectedDocumentTypeId, force: true },
      })
      setConflictDialog({ open: false, conflict: null, pendingTemplateId: null, pendingVersionId: null })
      navigateToTemplate(conflictDialog.pendingTemplateId, conflictDialog.pendingVersionId)
    } catch {
      setConflictDialog({ open: false, conflict: null, pendingTemplateId: null, pendingVersionId: null })
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.createDialog.title', 'New Template')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                {t(
                  'templates.createDialog.description',
                  'Create a new document template'
                )}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 p-6">
              {/* Title field */}
              <div>
                <label
                  htmlFor="template-title"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('templates.createDialog.titleLabel', 'Title')}
                </label>
                <input
                  id="template-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    'templates.createDialog.titlePlaceholder',
                    'Enter template title...'
                  )}
                  maxLength={255}
                  autoFocus
                  className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                />
              </div>

              {/* Document Type field */}
              <div>
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('templates.createDialog.documentTypeLabel', 'Document Type')}
                </label>
                <DocumentTypeSelector
                  currentTypeId={selectedDocumentTypeId}
                  currentTypeName={null}
                  onAssign={async (id) => setSelectedDocumentTypeId(id)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Tags field */}
              <div>
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('templates.createDialog.tagsLabel', 'Tags')}
                </label>
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onSelectionChange={setSelectedTagIds}
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
                disabled={!title.trim() || isSubmitting}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {isSubmitting
                  ? t('common.creating', 'Creating...')
                  : t('templates.createDialog.submit', 'Create Template')}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>

    <DocumentTypeConflictDialog
      open={conflictDialog.open}
      conflictTemplate={conflictDialog.conflict}
      onCancel={() => {
        setConflictDialog({ open: false, conflict: null, pendingTemplateId: null, pendingVersionId: null })
        setIsSubmitting(false)
      }}
      onForce={handleForceAssignDocumentType}
      isLoading={assignDocumentType.isPending}
    />
    </>
  )
}
