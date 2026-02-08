import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DocumentType } from '../api/document-types-api'
import { useCreateDocumentType, useUpdateDocumentType } from '../hooks/useDocumentTypes'
import { useToast } from '@/components/ui/use-toast'
import axios from 'axios'

interface DocumentTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  documentType?: DocumentType | null
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
 * Note: Does NOT remove leading/trailing underscores (allows typing)
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

export function DocumentTypeFormDialog({
  open,
  onOpenChange,
  mode,
  documentType,
}: DocumentTypeFormDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [code, setCode] = useState('')
  const [nameEs, setNameEs] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [descEs, setDescEs] = useState('')
  const [descEn, setDescEn] = useState('')
  const [activeTab, setActiveTab] = useState<'es' | 'en'>('es')
  const [codeError, setCodeError] = useState('')
  const [nameError, setNameError] = useState('')

  const createMutation = useCreateDocumentType()
  const updateMutation = useUpdateDocumentType()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Reset form when dialog opens/closes or documentType changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && documentType) {
        setCode(documentType.code)
        setNameEs(documentType.name?.es || '')
        setNameEn(documentType.name?.en || '')
        setDescEs(documentType.description?.es || '')
        setDescEn(documentType.description?.en || '')
      } else {
        setCode('')
        setNameEs('')
        setNameEn('')
        setDescEs('')
        setDescEn('')
      }
      setActiveTab('es')
      setCodeError('')
      setNameError('')
    }
  }, [open, mode, documentType])

  const validateForm = (): boolean => {
    let isValid = true

    if (mode === 'create') {
      // Clean code for validation (remove leading/trailing underscores)
      const cleanedCode = cleanCodeForSubmit(code)
      if (!cleanedCode) {
        setCodeError(t('administration.documentTypes.form.codeRequired', 'Code is required'))
        isValid = false
      } else if (cleanedCode.length > 50) {
        setCodeError(t('administration.documentTypes.form.codeTooLong', 'Code must be 50 characters or less'))
        isValid = false
      } else if (!CODE_REGEX.test(cleanedCode)) {
        setCodeError(t('administration.documentTypes.form.codeInvalid', 'Code must contain only letters, numbers, and underscores'))
        isValid = false
      } else {
        setCodeError('')
      }
    }

    if (!nameEs.trim()) {
      setNameError(t('administration.documentTypes.form.nameRequired', 'Spanish name is required'))
      isValid = false
    } else {
      setNameError('')
    }

    return isValid
  }

  // Clean trailing underscores when user leaves the field
  const handleCodeBlur = () => {
    const cleaned = cleanCodeForSubmit(code)
    if (cleaned !== code) {
      setCode(cleaned)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure code is cleaned before validation
    const finalCode = cleanCodeForSubmit(code)
    if (finalCode !== code) {
      setCode(finalCode)
    }

    if (!validateForm()) return

    const name: Record<string, string> = {}
    if (nameEs.trim()) name.es = nameEs.trim()
    if (nameEn.trim()) name.en = nameEn.trim()

    const description: Record<string, string> = {}
    if (descEs.trim()) description.es = descEs.trim()
    if (descEn.trim()) description.en = descEn.trim()

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          code: finalCode,
          name,
          description: Object.keys(description).length > 0 ? description : undefined,
        })
        toast({
          title: t('administration.documentTypes.form.createSuccess', 'Document type created'),
        })
      } else if (documentType) {
        await updateMutation.mutateAsync({
          id: documentType.id,
          data: { name, description },
        })
        toast({
          title: t('administration.documentTypes.form.updateSuccess', 'Document type updated'),
        })
      }
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setCodeError(t('administration.documentTypes.form.codeExists', 'A document type with this code already exists'))
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t('administration.documentTypes.form.saveError', 'Failed to save document type'),
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
                ? t('administration.documentTypes.form.createTitle', 'Create Document Type')
                : t('administration.documentTypes.form.editTitle', 'Edit Document Type')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {mode === 'create'
                ? t('administration.documentTypes.form.createDescription', 'Add a new document type to organize templates.')
                : t('administration.documentTypes.form.editDescription', 'Update the document type details.')}
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
            {/* Code field - only in create mode */}
            {mode === 'create' && (
              <div>
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('administration.documentTypes.form.code', 'Code')} *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(normalizeCodeWhileTyping(e.target.value))
                    setCodeError('')
                  }}
                  onBlur={handleCodeBlur}
                  placeholder={t('administration.documentTypes.form.codePlaceholder', 'CONTRACT_TYPE')}
                  className={cn(
                    'w-full rounded-none border-0 border-b bg-transparent py-2 font-mono text-base uppercase text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0',
                    codeError ? 'border-destructive' : 'border-border'
                  )}
                  disabled={isLoading}
                  autoFocus
                />
                <p className={cn('mt-1 text-xs', codeError ? 'text-destructive' : 'text-muted-foreground')}>
                  {codeError || t('administration.documentTypes.form.codeHint', 'Only uppercase letters, numbers, and underscores')}
                </p>
              </div>
            )}

            {/* Code display in edit mode */}
            {mode === 'edit' && documentType && (
              <div>
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('administration.documentTypes.form.code', 'Code')}
                </label>
                <div className="border-b border-border bg-transparent py-2">
                  <span className="font-mono text-base uppercase text-muted-foreground">{documentType.code}</span>
                </div>
              </div>
            )}

            {/* Language tabs */}
            <div>
              <div className="flex gap-1 border-b border-border">
                <button
                  type="button"
                  className={cn(
                    'px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                    activeTab === 'es'
                      ? 'border-b-2 border-foreground font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActiveTab('es')}
                >
                  Español {!nameEs.trim() && <span className="text-destructive">*</span>}
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                    activeTab === 'en'
                      ? 'border-b-2 border-foreground font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActiveTab('en')}
                >
                  English
                </button>
              </div>

              {activeTab === 'es' && (
                <div className="space-y-6 pt-6">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('administration.documentTypes.form.name', 'Name')} *
                    </label>
                    <input
                      type="text"
                      value={nameEs}
                      onChange={(e) => {
                        setNameEs(e.target.value)
                        setNameError('')
                      }}
                      placeholder={t('administration.documentTypes.form.namePlaceholder', 'Type name')}
                      className={cn(
                        'w-full rounded-none border-0 border-b bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0',
                        nameError ? 'border-destructive' : 'border-border'
                      )}
                      disabled={isLoading}
                    />
                    <p className={cn('mt-1 text-xs', nameError ? 'text-destructive' : 'text-transparent')}>
                      {nameError || '\u00A0'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('administration.documentTypes.form.description', 'Description')}
                    </label>
                    <textarea
                      value={descEs}
                      onChange={(e) => setDescEs(e.target.value)}
                      placeholder={t('administration.documentTypes.form.descriptionPlaceholder', 'Optional description')}
                      rows={3}
                      className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'en' && (
                <div className="space-y-6 pt-6">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('administration.documentTypes.form.name', 'Name')}
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder={t('administration.documentTypes.form.namePlaceholder', 'Type name')}
                      className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('administration.documentTypes.form.description', 'Description')}
                    </label>
                    <textarea
                      value={descEn}
                      onChange={(e) => setDescEn(e.target.value)}
                      placeholder={t('administration.documentTypes.form.descriptionPlaceholder', 'Optional description')}
                      rows={3}
                      className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
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
