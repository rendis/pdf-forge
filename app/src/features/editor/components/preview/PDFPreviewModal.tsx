import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import {
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  FileText,
} from 'lucide-react'

// Import worker as Vite asset
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface PDFPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfBlob: Blob | null
  fileName?: string
}

export function PDFPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  fileName = 'preview.pdf',
}: PDFPreviewModalProps) {
  const { t } = useTranslation()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isLoadingPDF, setIsLoadingPDF] = useState(true)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [scale, setScale] = useState(1.0)
  const [pageInputValue, setPageInputValue] = useState('1')
  const [isFitToWidth, setIsFitToWidth] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Medir ancho del contenedor para escalar PDF
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 32
        setContainerWidth(width)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [open])

  // Crear y limpiar blob URL
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      setBlobUrl(url)
      setIsLoadingPDF(true)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
    setBlobUrl(null)
  }, [pdfBlob])

  // Sincronizar input de pagina con pageNumber
  useEffect(() => {
    setPageInputValue(pageNumber.toString())
  }, [pageNumber])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowLeft':
          if (pageNumber > 1) {
            e.preventDefault()
            setPageNumber((prev) => Math.max(1, prev - 1))
          }
          break
        case 'ArrowRight':
          if (pageNumber < (numPages || 1)) {
            e.preventDefault()
            setPageNumber((prev) => Math.min(numPages || prev, prev + 1))
          }
          break
        case '+':
        case '=':
          e.preventDefault()
          setIsFitToWidth(false)
          setScale((prev) => Math.min(prev + 0.25, 3.0))
          break
        case '-':
          e.preventDefault()
          setIsFitToWidth(false)
          setScale((prev) => Math.max(prev - 0.25, 0.5))
          break
        case '0':
          e.preventDefault()
          setIsFitToWidth(false)
          setScale(1.0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, pageNumber, numPages])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setPageNumber(1)
      setIsLoadingPDF(false)
    },
    []
  )

  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(numPages || prev, prev + 1))
  }, [numPages])

  const handleDownload = useCallback(() => {
    if (!pdfBlob) return

    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [pdfBlob, fileName])

  const handleZoomIn = useCallback(() => {
    setIsFitToWidth(false)
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }, [])

  const handleZoomOut = useCallback(() => {
    setIsFitToWidth(false)
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleZoomReset = useCallback(() => {
    setIsFitToWidth(false)
    setScale(1.0)
  }, [])

  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPageInputValue(e.target.value)
    },
    []
  )

  const handlePageInputSubmit = useCallback(() => {
    const pageNum = parseInt(pageInputValue)
    if (pageNum >= 1 && pageNum <= (numPages || 1)) {
      setPageNumber(pageNum)
    } else {
      setPageInputValue(pageNumber.toString())
    }
  }, [pageInputValue, numPages, pageNumber])

  if (!pdfBlob || !blobUrl) {
    return null
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-[90vw] h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200 flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('editor.preview.pdfModal.title')}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-4 p-6 min-h-0">
            {/* PDF Viewer */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto flex items-start justify-center bg-muted/30 border border-border p-4"
            >
              {isLoadingPDF && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('editor.preview.pdfModal.loading')}
                    </p>
                  </div>
                </div>
              )}

              <Document
                file={blobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error('Error loading PDF:', error)
                  setIsLoadingPDF(false)
                }}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-destructive mb-4 font-mono text-xs uppercase tracking-wider">
                      {t('editor.preview.pdfModal.error')}
                    </p>
                    <button
                      onClick={handleDownload}
                      className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {t('editor.preview.download')}
                    </button>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={isFitToWidth ? containerWidth || undefined : undefined}
                  scale={isFitToWidth ? undefined : scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
            </div>

            {/* Navigation Controls */}
            {numPages && numPages > 1 && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 border border-border bg-muted/30">
                {/* Navigation Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber === 1}
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    title={t('common.previous')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber === numPages}
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    title={t('common.next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Page Counter with Input */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('editor.preview.pdfModal.page')}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={numPages}
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                    className="w-12 h-8 px-2 text-center font-mono text-xs border border-border bg-background focus-visible:outline-none focus-visible:border-foreground"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    / {numPages}
                  </span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={scale <= 0.5}
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    title={t('editor.preview.pdfModal.zoomOut')}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground min-w-[3rem] text-center">
                    {isFitToWidth ? 'Auto' : `${Math.round(scale * 100)}%`}
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={scale >= 3.0}
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    title={t('editor.preview.pdfModal.zoomIn')}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                    title={t('editor.preview.pdfModal.zoomReset')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {t('editor.preview.close')}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('editor.preview.download')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
