import { useRef, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUp, FileJson, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabProps } from './types'
import type { PortableDocument } from '../../types/document-format'

export function FileTab({ onDocumentReady }: TabProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const processFile = useCallback(async (file: File) => {
    // Reset state
    setError(null)
    setFileName(null)
    setIsDragging(false)

    // Validate file type
    if (!file.name.endsWith('.json')) {
      const errorMsg = t('editor.import.invalidFileType')
      setError(errorMsg)
      onDocumentReady(null, errorMsg)
      return
    }

    try {
      const text = await file.text()
      const doc = JSON.parse(text) as PortableDocument
      setFileName(file.name)
      onDocumentReady(doc)
    } catch {
      const errorMsg = t('editor.import.invalidJson')
      setError(errorMsg)
      onDocumentReady(null, errorMsg)
    }
  }, [onDocumentReady, t])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await processFile(file)

    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (!file) {
      setIsDragging(false)
      return
    }

    await processFile(file)
  }, [processFile])

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'w-full flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-foreground/50 hover:bg-muted/50'
        )}
      >
        <div className={cn(
          'p-3 rounded-full transition-colors',
          isDragging ? 'bg-primary/10' : 'bg-muted'
        )}>
          <FileUp className={cn(
            'h-6 w-6',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        <div className="text-center">
          <p className={cn(
            'text-sm font-medium',
            isDragging && 'text-primary'
          )}>
            {isDragging
              ? t('editor.import.dropHere')
              : t('editor.import.fileTabDescription')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('editor.import.acceptedFormat')}
          </p>
        </div>
      </div>

      {/* Success state */}
      {fileName && !error && (
        <div className="flex items-center gap-3 p-3 bg-success-muted border border-success-border rounded-lg">
          <FileJson className="h-5 w-5 text-success" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-success-foreground truncate">
              {fileName}
            </p>
            <p className="text-xs text-success-foreground/80">
              {t('editor.import.fileSelected')}
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
