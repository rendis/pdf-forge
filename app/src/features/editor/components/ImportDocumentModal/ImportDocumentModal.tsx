import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, FileUp, ClipboardPaste } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileTab } from './FileTab'
import { PasteJsonTab } from './PasteJsonTab'
import type { ImportDocumentModalProps, ImportTab } from './types'
import type { PortableDocument } from '../../types/document-format'

export function ImportDocumentModal({
  open,
  onOpenChange,
  onImport,
}: ImportDocumentModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ImportTab>('file')
  const [document, setDocument] = useState<PortableDocument | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDocument(null)
      setParseError(null)
      setActiveTab('file')
    }
  }, [open])

  const handleDocumentReady = useCallback((doc: PortableDocument | null, error?: string) => {
    setDocument(doc)
    setParseError(error || null)
  }, [])

  const handleImport = useCallback(() => {
    if (!document) return
    onImport(document)
    onOpenChange(false)
  }, [document, onImport, onOpenChange])

  const handleClose = useCallback(() => {
    setDocument(null)
    setParseError(null)
    setActiveTab('file')
    onOpenChange(false)
  }, [onOpenChange])

  const handleTabChange = useCallback((tab: ImportTab) => {
    setActiveTab(tab)
    // Reset document when switching tabs
    setDocument(null)
    setParseError(null)
  }, [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
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
                {t('editor.import.title')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                {t('editor.import.description')}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">{t('common.close')}</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as ImportTab)}>
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger
                  value="file"
                  className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider"
                >
                  <FileUp className="h-4 w-4" />
                  {t('editor.import.tabs.file')}
                </TabsTrigger>
                <TabsTrigger
                  value="paste"
                  className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  {t('editor.import.tabs.paste')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4 min-h-[340px]">
                <FileTab onDocumentReady={handleDocumentReady} />
              </TabsContent>

              <TabsContent value="paste" className="mt-4 min-h-[340px]">
                <PasteJsonTab onDocumentReady={handleDocumentReady} />
              </TabsContent>
            </Tabs>

            {/* Global error display (for parse errors not shown in tabs) */}
            {parseError && !['file', 'paste'].includes(activeTab) && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!document}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('editor.import.importDocument')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
