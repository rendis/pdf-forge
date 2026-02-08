import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Shuffle, Loader2, AlertCircle, ImageIcon } from 'lucide-react'
import type { Variable } from '../../types/variables'

const URL_REGEX = /^https?:\/\/.+/i
const DEBOUNCE_MS = 500

const generateRandomUrl = () => {
  const seed = Math.random().toString(36).substring(7)
  return `https://picsum.photos/seed/${seed}/400/300`
}

interface ImageInjectableInputProps {
  variable: Variable
  value?: string
  error?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ImageInjectableInput({
  variable,
  value,
  error,
  onChange,
  disabled,
}: ImageInjectableInputProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string | null>(value ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPreview = useCallback((url: string) => {
    if (!URL_REGEX.test(url)) {
      setPreview(null)
      setPreviewError(t('editor.preview.invalidUrl'))
      return
    }

    setIsLoading(true)
    setPreviewError(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      setPreview(url)
      setIsLoading(false)
      setPreviewError(null)
    }

    img.onerror = () => {
      setPreview(null)
      setIsLoading(false)
      setPreviewError(t('editor.preview.imageLoadError'))
    }

    img.src = url
  }, [t])

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!newValue.trim()) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      loadPreview(newValue.trim())
    }, DEBOUNCE_MS)
  }, [onChange, loadPreview])

  const handleGenerateRandom = useCallback(() => {
    const url = generateRandomUrl()
    onChange(url)
    setIsLoading(true)
    setPreviewError(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setPreview(url)
      setIsLoading(false)
    }
    img.onerror = () => {
      setPreview(null)
      setIsLoading(false)
      setPreviewError(t('editor.preview.imageLoadError'))
    }
    img.src = url
  }, [onChange, t])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Load preview on initial value
  useEffect(() => {
    if (value && !preview && !isLoading) {
      loadPreview(value)
    }
  }, [value, preview, isLoading, loadPreview])

  return (
    <div className="space-y-2">
      <Label htmlFor={`image-${variable.variableId}`}>{variable.label}</Label>
      <div className="flex gap-2">
        <Input
          id={`image-${variable.variableId}`}
          type="url"
          placeholder="https://ejemplo.com/imagen.jpg"
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateRandom}
                disabled={disabled}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editor.preview.generateRandomImage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="min-h-[100px] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!isLoading && previewError && (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs text-center px-4">{previewError}</span>
          </div>
        )}

        {!isLoading && !previewError && !preview && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        {!isLoading && !previewError && preview && (
          <img
            src={preview}
            alt={variable.label}
            className="max-h-[100px] max-w-full object-contain"
            crossOrigin="anonymous"
          />
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
