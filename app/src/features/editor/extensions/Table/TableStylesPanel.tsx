import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Editor } from '@tiptap/core'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Palette, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  type TableStylesAttrs,
} from './types'

interface TableStylesPanelProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Node type to edit styles for. Defaults to 'table' */
  nodeType?: 'table' | 'tableInjector' | 'listInjector'
  /** Initial styles to load when opening. If not provided, uses editor.getAttributes() */
  initialStyles?: Partial<TableStylesAttrs>
  /** Direct update callback (from NodeView's updateAttributes). Bypasses editor commands. */
  onApplyStyles?: (attrs: Record<string, unknown>) => void
}

export function TableStylesPanel({ editor, open, onOpenChange, nodeType = 'table', initialStyles, onApplyStyles }: TableStylesPanelProps) {
  const { t } = useTranslation()
  const [styles, setStyles] = useState<TableStylesAttrs>({})

  // Load current styles when dialog opens
  useEffect(() => {
    if (!open || !editor) return

    const attrs = initialStyles ?? editor.getAttributes(nodeType)

    if (nodeType === 'listInjector') {
      // Map item* attrs to body* state keys for the shared form
      setStyles({
        headerFontFamily: attrs.headerFontFamily || 'inherit',
        headerFontSize: attrs.headerFontSize || 12,
        headerFontWeight: attrs.headerFontWeight || 'bold',
        headerTextColor: attrs.headerTextColor || '#333333',
        headerBackground: attrs.headerBackground || '#f5f5f5',
        bodyFontFamily: attrs.itemFontFamily || 'inherit',
        bodyFontSize: attrs.itemFontSize || 12,
        bodyFontWeight: attrs.itemFontWeight || 'normal',
        bodyTextColor: attrs.itemTextColor || '#333333',
      })
    } else {
      setStyles({
        headerFontFamily: attrs.headerFontFamily || 'inherit',
        headerFontSize: attrs.headerFontSize || 12,
        headerFontWeight: attrs.headerFontWeight || 'bold',
        headerTextColor: attrs.headerTextColor || '#333333',
        headerTextAlign: attrs.headerTextAlign || 'left',
        headerBackground: attrs.headerBackground || '#f5f5f5',
        bodyFontFamily: attrs.bodyFontFamily || 'inherit',
        bodyFontSize: attrs.bodyFontSize || 12,
        bodyFontWeight: attrs.bodyFontWeight || 'normal',
        bodyTextColor: attrs.bodyTextColor || '#333333',
        bodyTextAlign: attrs.bodyTextAlign || 'left',
      })
    }
  }, [open, editor, nodeType, initialStyles])

  const handleApply = useCallback(() => {
    if (!editor) return

    // Clean up 'inherit' and empty strings to null
    const cleanStyles = Object.fromEntries(
      Object.entries(styles).map(([key, value]) => [
        key,
        value === '' || value === 'inherit' ? null : value,
      ])
    )

    if (nodeType === 'listInjector') {
      // Remap body* state keys back to item* attrs for list injector
      const listStyles = {
        headerFontFamily: cleanStyles.headerFontFamily,
        headerFontSize: cleanStyles.headerFontSize,
        headerFontWeight: cleanStyles.headerFontWeight,
        headerTextColor: cleanStyles.headerTextColor,
        headerBackground: cleanStyles.headerBackground,
        itemFontFamily: cleanStyles.bodyFontFamily,
        itemFontSize: cleanStyles.bodyFontSize,
        itemFontWeight: cleanStyles.bodyFontWeight,
        itemTextColor: cleanStyles.bodyTextColor,
      }
      if (onApplyStyles) {
        onApplyStyles(listStyles)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(editor.commands as any).setListInjectorStyles(listStyles)
      }
    } else if (onApplyStyles) {
      // Direct update via NodeView's updateAttributes
      onApplyStyles(cleanStyles)
    } else if (nodeType === 'tableInjector') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(editor.commands as any).setTableInjectorStyles(cleanStyles)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(editor.commands as any).setTableStyles(cleanStyles)
    }
    onOpenChange(false)
  }, [editor, styles, onOpenChange, nodeType, onApplyStyles])

  const updateStyle = useCallback(
    <K extends keyof TableStylesAttrs>(key: K, value: TableStylesAttrs[K]) => {
      setStyles((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {nodeType === 'listInjector'
                  ? t('editor.list.stylesTitle', 'List Styles')
                  : t('editor.table.stylesTitle', 'Table Styles')}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger
                  value="header"
                  className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider"
                >
                  {t('editor.table.header', 'Header')}
                </TabsTrigger>
                <TabsTrigger
                  value="body"
                  className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider"
                >
                  {nodeType === 'listInjector'
                    ? t('editor.list.items', 'Items')
                    : t('editor.table.body', 'Body')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="header" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  {/* Font Family */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontFamily', 'Font Family')}</Label>
                    <Select
                      value={styles.headerFontFamily || 'inherit'}
                      onValueChange={(v) => updateStyle('headerFontFamily', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('editor.table.selectFont', 'Select font')} />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontSize', 'Font Size')}</Label>
                    <Select
                      value={String(styles.headerFontSize || 12)}
                      onValueChange={(v) => updateStyle('headerFontSize', parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Weight */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontWeight', 'Font Weight')}</Label>
                    <Select
                      value={styles.headerFontWeight || 'bold'}
                      onValueChange={(v) => updateStyle('headerFontWeight', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Color */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.textColor', 'Text Color')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.headerTextColor || '#333333'}
                        onChange={(e) => updateStyle('headerTextColor', e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        type="text"
                        value={styles.headerTextColor || '#333333'}
                        onChange={(e) => updateStyle('headerTextColor', e.target.value)}
                        className="h-9 flex-1"
                        placeholder="#333333"
                      />
                    </div>
                  </div>

                  {/* Text Align (not applicable to lists) */}
                  {nodeType !== 'listInjector' && (
                    <div className="grid gap-2">
                      <Label>{t('editor.table.textAlign', 'Text Align')}</Label>
                      <Select
                        value={styles.headerTextAlign || 'left'}
                        onValueChange={(v) => updateStyle('headerTextAlign', v as 'left' | 'center' | 'right')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_ALIGN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Background Color */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.background', 'Background')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.headerBackground || '#f5f5f5'}
                        onChange={(e) => updateStyle('headerBackground', e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        type="text"
                        value={styles.headerBackground || '#f5f5f5'}
                        onChange={(e) => updateStyle('headerBackground', e.target.value)}
                        className="h-9 flex-1"
                        placeholder="#f5f5f5"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="body" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  {/* Font Family */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontFamily', 'Font Family')}</Label>
                    <Select
                      value={styles.bodyFontFamily || 'inherit'}
                      onValueChange={(v) => updateStyle('bodyFontFamily', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('editor.table.selectFont', 'Select font')} />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontSize', 'Font Size')}</Label>
                    <Select
                      value={String(styles.bodyFontSize || 12)}
                      onValueChange={(v) => updateStyle('bodyFontSize', parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Weight */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.fontWeight', 'Font Weight')}</Label>
                    <Select
                      value={styles.bodyFontWeight || 'normal'}
                      onValueChange={(v) => updateStyle('bodyFontWeight', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Color */}
                  <div className="grid gap-2">
                    <Label>{t('editor.table.textColor', 'Text Color')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.bodyTextColor || '#333333'}
                        onChange={(e) => updateStyle('bodyTextColor', e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        type="text"
                        value={styles.bodyTextColor || '#333333'}
                        onChange={(e) => updateStyle('bodyTextColor', e.target.value)}
                        className="h-9 flex-1"
                        placeholder="#333333"
                      />
                    </div>
                  </div>

                  {/* Text Align (not applicable to lists) */}
                  {nodeType !== 'listInjector' && (
                    <div className="grid gap-2">
                      <Label>{t('editor.table.textAlign', 'Text Align')}</Label>
                      <Select
                        value={styles.bodyTextAlign || 'left'}
                        onValueChange={(v) => updateStyle('bodyTextAlign', v as 'left' | 'center' | 'right')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_ALIGN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              {t('common.apply', 'Apply')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
