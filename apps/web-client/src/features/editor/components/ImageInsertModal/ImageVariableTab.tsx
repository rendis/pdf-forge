import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ImageIcon, Shuffle, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInjectables } from '../../hooks/useInjectables'
import type { ImageVariableTabProps } from './types'

// Helper component for truncated text with conditional tooltip
function TruncatedText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth)
    }
  }, [text])

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <p ref={textRef} className={cn('truncate', className)}>
            {text}
          </p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <p ref={textRef} className={cn('truncate', className)}>
      {text}
    </p>
  )
}

const generatePlaceholderUrl = () => {
  const seed = Math.random().toString(36).substring(7)
  return `https://picsum.photos/seed/${seed}/400/300`
}

export function ImageVariableTab({ onSelect, currentSelection, hasUrlSelection }: ImageVariableTabProps) {
  const { t } = useTranslation()
  const { variables, isLoading } = useInjectables()
  const [selectedId, setSelectedId] = useState<string | null>(currentSelection ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const imageVariables = useMemo(
    () => variables.filter((v) => v.type === 'IMAGE'),
    [variables]
  )

  // Initialize preview when there's an initial selection and variables are loaded
  useEffect(() => {
    if (currentSelection && imageVariables.length > 0 && !previewUrl) {
      const variable = imageVariables.find((v) => v.variableId === currentSelection)
      if (variable) {
        const url = generatePlaceholderUrl()
        setPreviewUrl(url)
      }
    }
  }, [currentSelection, imageVariables, previewUrl])

  // Reset when user selects a URL in the URL tab
  useEffect(() => {
    if (hasUrlSelection) {
      setSelectedId(null)
      setPreviewUrl(null)
    }
  }, [hasUrlSelection])


  const handleSelect = useCallback((variableId: string, label: string) => {
    setSelectedId(variableId)
    setPreviewLoading(true)

    const url = generatePlaceholderUrl()
    setPreviewUrl(url)

    // Preload the image
    const img = new Image()
    img.onload = () => {
      setPreviewLoading(false)
      onSelect({
        src: url,
        isBase64: false,
        injectableId: variableId,
        injectableLabel: label,
      })
    }
    img.onerror = () => {
      setPreviewLoading(false)
      // Still select even if preview fails
      onSelect({
        src: url,
        isBase64: false,
        injectableId: variableId,
        injectableLabel: label,
      })
    }
    img.src = url
  }, [onSelect])

  const handleRefreshPlaceholder = useCallback(() => {
    if (!selectedId) return

    const variable = imageVariables.find((v) => v.variableId === selectedId)
    if (!variable) return

    setPreviewLoading(true)
    const url = generatePlaceholderUrl()
    setPreviewUrl(url)

    const img = new Image()
    img.onload = () => {
      setPreviewLoading(false)
      onSelect({
        src: url,
        isBase64: false,
        injectableId: selectedId,
        injectableLabel: variable.label,
      })
    }
    img.onerror = () => {
      setPreviewLoading(false)
    }
    img.src = url
  }, [selectedId, imageVariables, onSelect])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="mt-2 text-sm">{t('common.loading')}</span>
      </div>
    )
  }

  if (imageVariables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2" />
        <p className="text-sm">{t('editor.image.noImageVariables')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('editor.image.selectVariable')}</Label>
        <TooltipProvider>
          <div className="grid gap-2 max-h-[200px] overflow-y-auto">
            {imageVariables.map((variable) => (
              <button
                key={variable.variableId}
                type="button"
                onClick={() => handleSelect(variable.variableId, variable.label)}
                className={cn(
                  'flex items-center gap-3 w-full p-3 text-left border rounded-lg transition-colors overflow-hidden',
                  selectedId === variable.variableId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 shrink-0 rounded-md',
                  selectedId === variable.variableId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  {selectedId === variable.variableId ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <TruncatedText
                    text={variable.label}
                    className="text-sm font-medium"
                  />
                  {variable.description && (
                    <TruncatedText
                      text={variable.description}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {selectedId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('editor.image.placeholder')}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefreshPlaceholder}
                    disabled={previewLoading}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('editor.image.generatePlaceholder')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="min-h-[150px] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Placeholder"
                className="max-h-[150px] max-w-full object-contain"
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('editor.image.placeholderHint')}
          </p>
        </div>
      )}
    </div>
  )
}
