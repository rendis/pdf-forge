import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw, Sparkles } from 'lucide-react'
import type { InjectorType } from '../../types/variables'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface InjectableInputProps {
  variableId: string
  label: string
  type: InjectorType
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isEmulated?: boolean
  onResetToEmulated?: () => void
  onGenerate?: () => void
  disabled?: boolean
}

export function InjectableInput({
  variableId,
  label,
  type,
  value,
  error,
  onChange,
  isEmulated = false,
  onResetToEmulated,
  onGenerate,
  disabled = false,
}: InjectableInputProps) {
  const { t } = useTranslation()

  const handleChange = (newValue: unknown) => {
    onChange(newValue)
  }

  // TABLE type is handled by TableDataInput component
  if (type === 'TABLE') {
    return null
  }

  // BOOLEAN type
  if (type === 'BOOLEAN') {
    return (
      <div
        className={cn(
          'flex items-center justify-between',
          disabled && 'opacity-50'
        )}
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            id={variableId}
            checked={!!value}
            onCheckedChange={(checked) => handleChange(checked)}
            disabled={disabled}
          />
          <Label
            htmlFor={variableId}
            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </Label>
        </div>
        {isEmulated && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {t('editor.preview.auto')}
            </Badge>
            {onResetToEmulated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetToEmulated}
                disabled={disabled}
                className="h-6 px-2"
                title={t('editor.preview.resetToEmulated')}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Determinar tipo de input
  let inputType = 'text'
  let inputPrefix: string | undefined

  switch (type) {
    case 'NUMBER':
      inputType = 'number'
      break
    case 'CURRENCY':
      inputType = 'number'
      inputPrefix = '$'
      break
    case 'DATE':
      inputType = 'date'
      break
    default:
      inputType = 'text'
  }

  // Override for datetime/time system variables that need text input
  // These are mapped to DATE type but their emulated values are locale-formatted strings
  if (variableId === 'date_time_now' || variableId === 'time_now') {
    inputType = 'text'
  }

  // Calcular cantidad de iconos suffix
  const hasSuffixIcons = onGenerate || (isEmulated && onResetToEmulated)
  const suffixCount =
    (onGenerate ? 1 : 0) + (isEmulated && onResetToEmulated ? 1 : 0)

  return (
    <div className={cn('space-y-1.5', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between">
        <Label htmlFor={variableId} className="text-xs font-medium">
          {label}
        </Label>
        {isEmulated && (
          <Badge variant="secondary" className="text-xs">
            {t('editor.preview.auto')}
          </Badge>
        )}
      </div>
      <div className="relative">
        {inputPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {inputPrefix}
          </span>
        )}
        <Input
          id={variableId}
          type={inputType}
          value={(value as string) || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={cn(
            '[color-scheme:light] dark:[color-scheme:dark]',
            inputPrefix && 'pl-8',
            hasSuffixIcons && suffixCount === 1 && 'pr-10',
            hasSuffixIcons && suffixCount === 2 && 'pr-20',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          step={type === 'CURRENCY' || type === 'NUMBER' ? 'any' : undefined}
        />
        {/* Suffix icons inside input */}
        {hasSuffixIcons && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {onGenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onGenerate}
                disabled={disabled}
                title={t('editor.preview.generateRandom')}
              >
                <Sparkles className="h-3 w-3" />
              </Button>
            )}
            {isEmulated && onResetToEmulated && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onResetToEmulated}
                disabled={disabled}
                title={t('editor.preview.resetToEmulated')}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
