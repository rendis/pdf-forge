import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZES, DEFAULT_MARGINS, MARGIN_LIMITS, type PageMargins } from '../types'
import { usePaginationStore } from '../stores'

interface PageSettingsProps {
  /** Whether the settings are disabled (read-only mode) */
  disabled?: boolean
}

export function PageSettings({ disabled = false }: PageSettingsProps) {
  const { t } = useTranslation()
  const { pageSize, margins, setPageSize, setMargins } = usePaginationStore()

  const [open, setOpen] = useState(false)
  const [customMargins, setCustomMargins] = useState(margins)
  const [inputValues, setInputValues] = useState({
    top: String(margins.top),
    bottom: String(margins.bottom),
    left: String(margins.left),
    right: String(margins.right),
  })

  // Sincronizar customMargins e inputValues cuando margins del store cambie
  useEffect(() => {
    setCustomMargins(margins)
    setInputValues({
      top: String(margins.top),
      bottom: String(margins.bottom),
      left: String(margins.left),
      right: String(margins.right),
    })
  }, [margins])

  // Detectar si hay cambios pendientes de aplicar
  const hasChanges =
    customMargins.top !== margins.top ||
    customMargins.bottom !== margins.bottom ||
    customMargins.left !== margins.left ||
    customMargins.right !== margins.right

  // Detectar si los márgenes son diferentes a los defaults
  const isNotDefault =
    customMargins.top !== DEFAULT_MARGINS.top ||
    customMargins.bottom !== DEFAULT_MARGINS.bottom ||
    customMargins.left !== DEFAULT_MARGINS.left ||
    customMargins.right !== DEFAULT_MARGINS.right

  const handlePageSizeChange = (value: string) => {
    const size = PAGE_SIZES[value]
    if (size) {
      setPageSize(size)
    }
  }

  const handleMarginChange = (key: keyof PageMargins, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }))
  }

  const handleMarginBlur = (key: keyof PageMargins) => {
    const value = inputValues[key]
    const numValue = parseInt(value, 10)

    if (isNaN(numValue) || value === '') {
      // Restaurar al valor actual si es inválido
      setInputValues(prev => ({ ...prev, [key]: String(customMargins[key]) }))
      return
    }

    // Clampear al rango permitido
    const clampedValue = Math.max(MARGIN_LIMITS.min, Math.min(MARGIN_LIMITS.max, numValue))

    setInputValues(prev => ({ ...prev, [key]: String(clampedValue) }))
    setCustomMargins(prev => ({ ...prev, [key]: clampedValue }))
  }

  const handleApplyMargins = () => {
    setMargins(customMargins)
  }

  const handleReset = () => {
    setCustomMargins(DEFAULT_MARGINS)
    setInputValues({
      top: String(DEFAULT_MARGINS.top),
      bottom: String(DEFAULT_MARGINS.bottom),
      left: String(DEFAULT_MARGINS.left),
      right: String(DEFAULT_MARGINS.right),
    })
  }

  const getCurrentSizeKey = () => {
    return Object.entries(PAGE_SIZES).find(
      ([_, size]) => size.width === pageSize.width && size.height === pageSize.height
    )?.[0] || 'A4'
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <DialogPrimitive.Trigger asChild disabled={disabled}>
        <button
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 rounded-none border border-border bg-background px-3 py-1.5 text-sm transition-colors',
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-foreground hover:text-foreground'
          )}
        >
          <Settings2 className="h-4 w-4" />
          <span>{pageSize.label}</span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('editor.pageSettings.title')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                {t('editor.pageSettings.description')}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Page Size */}
            <div>
              <label
                htmlFor="page-size"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('editor.pageSettings.pageSize')}
              </label>
              <Select
                value={getCurrentSizeKey()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger id="page-size" className="border-border">
                  <SelectValue placeholder={t('editor.pageSettings.pageSizePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_SIZES).map(([key, size]) => (
                    <SelectItem key={key} value={key}>
                      {size.label} ({size.width} x {size.height}px)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Margins */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('editor.pageSettings.margins')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="margin-top"
                    className="mb-1 block text-xs text-muted-foreground"
                  >
                    {t('editor.pageSettings.marginTop')}
                  </label>
                  <input
                    id="margin-top"
                    type="number"
                    min={MARGIN_LIMITS.min}
                    max={MARGIN_LIMITS.max}
                    value={inputValues.top}
                    onChange={(e) => handleMarginChange('top', e.target.value)}
                    onBlur={() => handleMarginBlur('top')}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label
                    htmlFor="margin-bottom"
                    className="mb-1 block text-xs text-muted-foreground"
                  >
                    {t('editor.pageSettings.marginBottom')}
                  </label>
                  <input
                    id="margin-bottom"
                    type="number"
                    min={MARGIN_LIMITS.min}
                    max={MARGIN_LIMITS.max}
                    value={inputValues.bottom}
                    onChange={(e) => handleMarginChange('bottom', e.target.value)}
                    onBlur={() => handleMarginBlur('bottom')}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label
                    htmlFor="margin-left"
                    className="mb-1 block text-xs text-muted-foreground"
                  >
                    {t('editor.pageSettings.marginLeft')}
                  </label>
                  <input
                    id="margin-left"
                    type="number"
                    min={MARGIN_LIMITS.min}
                    max={MARGIN_LIMITS.max}
                    value={inputValues.left}
                    onChange={(e) => handleMarginChange('left', e.target.value)}
                    onBlur={() => handleMarginBlur('left')}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label
                    htmlFor="margin-right"
                    className="mb-1 block text-xs text-muted-foreground"
                  >
                    {t('editor.pageSettings.marginRight')}
                  </label>
                  <input
                    id="margin-right"
                    type="number"
                    min={MARGIN_LIMITS.min}
                    max={MARGIN_LIMITS.max}
                    value={inputValues.right}
                    onChange={(e) => handleMarginChange('right', e.target.value)}
                    onBlur={() => handleMarginBlur('right')}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isNotDefault}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('editor.pageSettings.reset')}
            </button>
            <button
              type="button"
              onClick={handleApplyMargins}
              disabled={!hasChanges}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {t('editor.pageSettings.applyMargins')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
