import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#000000', // black
]

interface CreateTagInlineProps {
  defaultName: string
  onCancel: () => void
  onSubmit: (name: string, color: string) => void
  isLoading?: boolean
}

export function CreateTagInline({
  defaultName,
  onCancel,
  onSubmit,
  isLoading = false,
}: CreateTagInlineProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(defaultName)
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[5] ?? '#3b82f6') // default blue

  const handleSubmit = () => {
    if (name.trim().length < 3) return
    onSubmit(name.trim(), selectedColor)
  }

  const isValid = name.trim().length >= 3 && name.trim().length <= 50

  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {t('tags.create.title', 'Create New Tag')}
      </div>

      {/* Name input */}
      <div className="mb-4">
        <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {t('tags.create.nameLabel', 'Name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('tags.create.namePlaceholder', 'Tag name (3-50 chars)')}
          maxLength={50}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
          autoFocus
        />
        {name.trim().length > 0 && name.trim().length < 3 && (
          <span className="mt-1 block text-xs text-destructive">
            {t('tags.create.minLength', 'Minimum 3 characters')}
          </span>
        )}
      </div>

      {/* Color picker */}
      <div className="mb-4">
        <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {t('tags.create.colorLabel', 'Color')}
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-all',
                selectedColor === color
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                  : 'hover:scale-110'
              )}
              style={{ backgroundColor: color }}
            >
              {selectedColor === color && (
                <Check
                  size={14}
                  className={cn(
                    color === '#000000' || color === '#6b7280'
                      ? 'text-white'
                      : 'text-white'
                  )}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-none border border-border bg-background px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="rounded-none bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {isLoading
            ? t('common.creating', 'Creating...')
            : t('tags.create.submit', 'Create Tag')}
        </button>
      </div>
    </div>
  )
}
