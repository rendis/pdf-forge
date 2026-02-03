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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DocumentType, DocumentTypeTemplateInfo } from '../api/document-types-api'
import { useDeleteDocumentType, useDocumentTypes } from '../hooks/useDocumentTypes'
import { useToast } from '@/components/ui/use-toast'

interface DeleteDocumentTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: DocumentType | null
}

function getLocalizedName(name: Record<string, string>, locale: string): string {
  return name[locale] || name['es'] || name['en'] || Object.values(name)[0] || ''
}

export function DeleteDocumentTypeDialog({
  open,
  onOpenChange,
  documentType,
}: DeleteDocumentTypeDialogProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  const [step, setStep] = useState<'confirm' | 'templates'>('confirm')
  const [templates, setTemplates] = useState<DocumentTypeTemplateInfo[]>([])
  const [action, setAction] = useState<'force' | 'replace' | null>(null)
  const [replacementId, setReplacementId] = useState('')

  const deleteMutation = useDeleteDocumentType()
  const { data: documentTypesData } = useDocumentTypes(1, 100)

  const isLoading = deleteMutation.isPending

  // Get other document types for replacement selector
  const otherDocumentTypes = documentTypesData?.data.filter(
    (dt) => dt.id !== documentType?.id
  ) ?? []

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('confirm')
      setTemplates([])
      setAction(null)
      setReplacementId('')
    }
  }, [open])

  const handleDelete = async () => {
    if (!documentType) return

    try {
      if (step === 'confirm') {
        // First attempt - no options
        const result = await deleteMutation.mutateAsync({
          id: documentType.id,
        })

        if (result.deleted) {
          toast({
            title: t('administration.documentTypes.delete.success', 'Document type deleted'),
          })
          onOpenChange(false)
        } else {
          // Has templates - show templates step
          setTemplates(result.templates)
          setStep('templates')
        }
      } else if (step === 'templates') {
        // Second attempt with options
        if (!action) return

        const options = action === 'force'
          ? { force: true }
          : { replaceWithId: replacementId }

        const result = await deleteMutation.mutateAsync({
          id: documentType.id,
          options,
        })

        if (result.deleted) {
          toast({
            title: t('administration.documentTypes.delete.success', 'Document type deleted'),
          })
          onOpenChange(false)
        }
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.documentTypes.delete.error', 'Failed to delete document type'),
      })
    }
  }

  const canConfirm = step === 'confirm' || (
    step === 'templates' && (
      action === 'force' ||
      (action === 'replace' && replacementId)
    )
  )

  if (!documentType) return <></>

  const displayName = getLocalizedName(documentType.name, i18n.language)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('administration.documentTypes.delete.title', 'Delete Document Type')}
          </DialogTitle>
          <DialogDescription>
            {step === 'confirm'
              ? t(
                  'administration.documentTypes.delete.confirm',
                  'Are you sure you want to delete "{{name}}"?',
                  { name: displayName }
                )
              : t(
                  'administration.documentTypes.delete.hasTemplatesDescription',
                  'This document type is being used. Choose how to proceed.'
                )}
          </DialogDescription>
        </DialogHeader>

        {step === 'templates' && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex gap-3 rounded-sm border border-warning-border bg-warning-muted p-3">
              <AlertTriangle size={20} className="shrink-0 text-warning-foreground" />
              <p className="text-sm text-warning-foreground">
                {t(
                  'administration.documentTypes.delete.hasTemplates',
                  'This document type is used by {{count}} template(s)',
                  { count: templates.length }
                )}
              </p>
            </div>

            {/* Templates list */}
            <div className="max-h-40 overflow-y-auto rounded-sm border border-border">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border-b border-border px-3 py-2 last:border-0"
                >
                  <span className="text-sm font-medium">{template.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({template.workspaceName})
                  </span>
                </div>
              ))}
            </div>

            {/* Action selection */}
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={action === 'force'}
                  onChange={() => setAction('force')}
                  className="mt-0.5"
                  disabled={isLoading}
                />
                <div>
                  <span className="text-sm font-medium">
                    {t('administration.documentTypes.delete.forceOption', 'Remove type from all templates')}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t('administration.documentTypes.delete.forceHint', 'Templates will have no document type assigned')}
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={action === 'replace'}
                  onChange={() => setAction('replace')}
                  className="mt-0.5"
                  disabled={isLoading || otherDocumentTypes.length === 0}
                />
                <div className="flex-1">
                  <span className={cn(
                    'text-sm font-medium',
                    otherDocumentTypes.length === 0 && 'text-muted-foreground'
                  )}>
                    {t('administration.documentTypes.delete.replaceOption', 'Replace with another type')}
                  </span>
                  {otherDocumentTypes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('administration.documentTypes.delete.noOtherTypes', 'No other document types available')}
                    </p>
                  )}
                </div>
              </label>

              {action === 'replace' && otherDocumentTypes.length > 0 && (
                <select
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                  className="ml-6 w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
                  disabled={isLoading}
                >
                  <option value="">
                    {t('administration.documentTypes.delete.selectReplacement', 'Select replacement type...')}
                  </option>
                  {otherDocumentTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {getLocalizedName(dt.name, i18n.language)} ({dt.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

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
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            disabled={isLoading || !canConfirm}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {t('common.delete', 'Delete')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
