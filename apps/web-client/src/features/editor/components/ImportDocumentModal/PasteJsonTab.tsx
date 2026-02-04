import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, ClipboardPaste } from 'lucide-react'
import type { TabProps } from './types'
import type { PortableDocument } from '../../types/document-format'

export function PasteJsonTab({ onDocumentReady }: TabProps) {
  const { t } = useTranslation()
  const [jsonText, setJsonText] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleParse = useCallback(() => {
    if (!jsonText.trim()) {
      setError(t('editor.import.emptyContent'))
      setIsValid(false)
      onDocumentReady(null)
      return
    }

    try {
      const doc = JSON.parse(jsonText) as PortableDocument
      setIsValid(true)
      setError(null)
      onDocumentReady(doc)
    } catch {
      const errorMsg = t('editor.import.invalidJson')
      setError(errorMsg)
      setIsValid(false)
      onDocumentReady(null, errorMsg)
    }
  }, [jsonText, onDocumentReady, t])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value)
    // Reset validation state when content changes
    if (isValid !== null) {
      setIsValid(null)
      setError(null)
      onDocumentReady(null)
    }
  }, [isValid, onDocumentReady])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJsonText(text)
      setIsValid(null)
      setError(null)
      onDocumentReady(null)
    } catch {
      // Clipboard access denied - user will need to paste manually
    }
  }, [onDocumentReady])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {t('editor.import.pasteLabel')}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="h-7 px-2 text-xs"
          >
            <ClipboardPaste className="h-3 w-3 mr-1" />
            {t('editor.import.pasteFromClipboard')}
          </Button>
        </div>
        <textarea
          value={jsonText}
          onChange={handleTextChange}
          placeholder={t('editor.import.pastePlaceholder')}
          className="w-full h-48 p-3 text-sm font-mono bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Parse button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleParse}
        disabled={!jsonText.trim()}
        className="w-full"
      >
        {t('editor.import.parseButton')}
      </Button>

      {/* Success state */}
      {isValid === true && (
        <div className="flex items-center gap-2 p-3 bg-success-muted border border-success-border rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm text-success-foreground">
            {t('editor.import.jsonValid')}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
