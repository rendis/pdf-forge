import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { InjectorType } from '../types/variables'

interface InjectorConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  injectorType: InjectorType
  variableId: string
  variableLabel: string
  currentConfig: {
    prefix?: string | null
    suffix?: string | null
    showLabelIfEmpty?: boolean
    defaultValue?: string | null
    format?: string | null
  }
  onApply: (config: {
    prefix?: string | null
    suffix?: string | null
    showLabelIfEmpty?: boolean
    defaultValue?: string | null
  }) => void
}

export function InjectorConfigDialog({
  open,
  onOpenChange,
  injectorType,
  variableId,
  variableLabel,
  currentConfig,
  onApply,
}: InjectorConfigDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [prefix, setPrefix] = useState(currentConfig.prefix || '')
  const [suffix, setSuffix] = useState(currentConfig.suffix || '')
  const [showLabelIfEmpty, setShowLabelIfEmpty] = useState(
    currentConfig.showLabelIfEmpty || false
  )
  const [defaultValue, setDefaultValue] = useState(
    currentConfig.defaultValue || ''
  )

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPrefix(currentConfig.prefix || '')
      setSuffix(currentConfig.suffix || '')
      setShowLabelIfEmpty(currentConfig.showLabelIfEmpty || false)
      setDefaultValue(currentConfig.defaultValue || '')
      setIsSubmitting(false)
    }
  }, [open, currentConfig])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      onApply({
        prefix: prefix || null,
        suffix: suffix || null,
        showLabelIfEmpty,
        defaultValue: defaultValue || null,
      })
    } finally {
      setIsSubmitting(false)
      onOpenChange(false)
    }
  }

  // Generate preview
  const getPreview = (): string => {
    const value = defaultValue || variableId
    const parts: string[] = []

    if (prefix) parts.push(prefix)
    parts.push(value)
    if (suffix) parts.push(suffix)

    return parts.join('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('editor.injector_config.title')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {variableLabel}
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
            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider">
                {t('editor.injector_config.preview')}
              </Label>
              <div className="border border-border bg-muted/30 px-4 py-3 font-mono text-sm">
                {getPreview()}
              </div>
            </div>

            {/* Prefix (Left) */}
            <div className="space-y-2">
              <Label htmlFor="prefix" className="text-xs font-medium uppercase tracking-wider">
                {t('editor.injector_config.prefix')}
              </Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder={t('editor.injector_config.prefix_placeholder')}
                maxLength={100}
                className="border-border font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {t('editor.injector_config.prefix_help')}
              </p>
            </div>

            {/* Suffix (Right) */}
            <div className="space-y-2">
              <Label htmlFor="suffix" className="text-xs font-medium uppercase tracking-wider">
                {t('editor.injector_config.suffix')}
              </Label>
              <Input
                id="suffix"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder={t('editor.injector_config.suffix_placeholder')}
                maxLength={100}
                className="border-border font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {t('editor.injector_config.suffix_help')}
              </p>
            </div>

            {/* Empty Value Behavior */}
            <div className="space-y-4 border border-border p-4">
              <Label className="text-xs font-medium uppercase tracking-wider">
                {t('editor.injector_config.empty_value_behavior')}
              </Label>

              {/* Show Label When Empty */}
              <div className="flex gap-3">
                <div className="flex items-center pt-0.5">
                  <Checkbox
                    id="show-label-empty"
                    checked={showLabelIfEmpty}
                    onCheckedChange={(checked) => setShowLabelIfEmpty(checked === true)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="show-label-empty" className="cursor-pointer text-xs font-normal">
                    {t('editor.injector_config.show_label_when_empty')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('editor.injector_config.show_label_when_empty_desc')}
                  </p>
                </div>
              </div>

              {/* Default Value */}
              <div className="space-y-2">
                <Label htmlFor="default-value" className="text-xs font-medium">
                  {t('editor.injector_config.default_value')}
                </Label>
                <Input
                  id="default-value"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder={t('editor.injector_config.default_value_placeholder')}
                  className="border-border font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {t('editor.injector_config.default_value_desc')}
                </p>
              </div>
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving') : t('common.apply')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
