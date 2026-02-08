import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Dialog, BaseDialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useUpdateTemplate,
  useAddTagsToTemplate,
  useRemoveTagFromTemplate,
} from '../hooks/useTemplates'
import { TagSelector } from './TagSelector'
import type { TemplateListItem } from '@/types/api'

interface EditTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateListItem | null
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditTemplateDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateTemplate = useUpdateTemplate()
  const addTagsToTemplate = useAddTagsToTemplate()
  const removeTagFromTemplate = useRemoveTagFromTemplate()

  // Initialize form when dialog opens or template changes
  useEffect(() => {
    if (open && template) {
      setTitle(template.title)
      setSelectedTagIds(template.tags.map((t) => t.id))
      setIsSubmitting(false)
    }
  }, [open, template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template || !title.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const currentTagIds = template.tags.map((t) => t.id)
      const tagsToAdd = selectedTagIds.filter((id) => !currentTagIds.includes(id))
      const tagsToRemove = currentTagIds.filter((id) => !selectedTagIds.includes(id))

      // 1. Update title if changed
      if (title.trim() !== template.title) {
        await updateTemplate.mutateAsync({
          templateId: template.id,
          data: { title: title.trim() },
        })
      }

      // 2. Add new tags
      if (tagsToAdd.length > 0) {
        await addTagsToTemplate.mutateAsync({
          templateId: template.id,
          tagIds: tagsToAdd,
        })
      }

      // 3. Remove tags
      for (const tagId of tagsToRemove) {
        await removeTagFromTemplate.mutateAsync({
          templateId: template.id,
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
              {t('templates.editDialog.title', 'Edit Template')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'templates.editDialog.description',
                'Update template name and tags'
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
          <div className="space-y-6 p-6">
            {/* Title field */}
            <div>
              <label
                htmlFor="edit-template-title"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('templates.editDialog.titleLabel', 'Title')}
              </label>
              <input
                id="edit-template-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(
                  'templates.editDialog.titlePlaceholder',
                  'Enter template title...'
                )}
                maxLength={255}
                autoFocus
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>

            {/* Tags field */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.editDialog.tagsLabel', 'Tags')}
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
                ? t('common.saving', 'Saving...')
                : t('templates.editDialog.submit', 'Save Changes')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
