import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Dialog, BaseDialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useAddTagsToTemplate,
  useRemoveTagFromTemplate,
} from '../hooks/useTemplates'
import { TagSelector } from './TagSelector'
import type { Tag } from '@/types/api'

interface EditTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string
  currentTags: Tag[]
}

export function EditTagsDialog({
  open,
  onOpenChange,
  templateId,
  currentTags,
}: EditTagsDialogProps) {
  const { t } = useTranslation()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTagsToTemplate = useAddTagsToTemplate()
  const removeTagFromTemplate = useRemoveTagFromTemplate()

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTagIds(currentTags.map((t) => t.id))
      setIsSubmitting(false)
    }
  }, [open, currentTags])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const currentTagIds = currentTags.map((t) => t.id)
      const tagsToAdd = selectedTagIds.filter((id) => !currentTagIds.includes(id))
      const tagsToRemove = currentTagIds.filter((id) => !selectedTagIds.includes(id))

      // Add new tags
      if (tagsToAdd.length > 0) {
        await addTagsToTemplate.mutateAsync({
          templateId,
          tagIds: tagsToAdd,
        })
      }

      // Remove tags
      for (const tagId of tagsToRemove) {
        await removeTagFromTemplate.mutateAsync({
          templateId,
          tagId,
        })
      }

      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('templates.editTagsDialog.title', 'Edit Tags')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'templates.editTagsDialog.description',
                'Add or remove tags from this template'
              )}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <TagSelector
              selectedTagIds={selectedTagIds}
              onSelectionChange={setSelectedTagIds}
            />
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
              disabled={isSubmitting}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : t('templates.editTagsDialog.submit', 'Save Tags')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
