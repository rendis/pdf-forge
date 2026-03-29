import { useMemo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ImageIcon, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useInjectables } from '../../hooks/useInjectables'
import { IMAGE_VARIABLE_PLACEHOLDER_SRC } from '../../utils/image-variable-placeholder'
import type { ImageVariableTabProps } from './types'

export function ImageVariableTab({
  onSelect,
  currentSelection,
}: ImageVariableTabProps) {
  const { t } = useTranslation()
  const { variables, isLoading } = useInjectables()
  const [selectedId, setSelectedId] = useState<string | null>(currentSelection ?? null)

  const imageVariables = useMemo(
    () => variables.filter((v) => v.type === 'IMAGE'),
    [variables],
  )

  const activeSelection = currentSelection ?? selectedId

  const handleSelect = useCallback(
    (variableId: string, label: string) => {
      setSelectedId(variableId)
      onSelect({
        src: IMAGE_VARIABLE_PLACEHOLDER_SRC,
        isBase64: true,
        injectableId: variableId,
        injectableLabel: label,
      })
    },
    [onSelect],
  )

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
        <ImageIcon className="mb-2 h-12 w-12" />
        <p className="text-sm">{t('editor.image.noImageVariables')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('editor.image.selectVariable')}</Label>
        <div className="grid max-h-[200px] gap-2 overflow-y-auto">
          {imageVariables.map((variable) => (
            <button
              key={variable.variableId}
              type="button"
              onClick={() => handleSelect(variable.variableId, variable.label)}
              className={cn(
                'flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition-colors',
                activeSelection === variable.variableId
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  activeSelection === variable.variableId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                )}
              >
                {activeSelection === variable.variableId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{variable.label}</p>
                {variable.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('editor.image.placeholder')}</Label>
        <div className="flex min-h-[150px] items-center justify-center overflow-hidden rounded-lg bg-muted">
          {activeSelection ? (
            <img
              src={IMAGE_VARIABLE_PLACEHOLDER_SRC}
              alt={t('editor.image.placeholder')}
              className="max-h-[150px] max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm">{t('editor.image.placeholder')}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('editor.image.placeholderHint')}
        </p>
      </div>
    </div>
  )
}
