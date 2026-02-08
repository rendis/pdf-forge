import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Variable } from '../../types/variables'
import type {
  InjectableFormValues,
  InjectableFormErrors,
} from '../../types/preview'
import { InjectableInput } from './InjectableInput'
import { INTERNAL_INJECTABLE_KEYS } from '../../types/injectable'

interface StandardInjectablesSectionProps {
  variables: Variable[]
  values: InjectableFormValues
  errors: InjectableFormErrors
  onChange: (variableId: string, value: unknown) => void
  onGenerate?: (variableId: string) => void
  onFillAll?: () => void
  disabled?: boolean
}

export function StandardInjectablesSection({
  variables,
  values,
  errors,
  onChange,
  onGenerate,
  onFillAll,
  disabled = false,
}: StandardInjectablesSectionProps) {
  const { t } = useTranslation()

  // Filtrar inyectables de sistema para que NO aparezcan en esta seccion
  const nonSystemVariables = variables.filter(
    (v) =>
      !INTERNAL_INJECTABLE_KEYS.includes(
        v.variableId as (typeof INTERNAL_INJECTABLE_KEYS)[number]
      )
  )

  if (nonSystemVariables.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Fill All button */}
      {onFillAll && nonSystemVariables.length > 1 && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onFillAll}
            disabled={disabled}
            className="h-7 text-xs gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            {t('editor.preview.fillAllRandom')}
          </Button>
        </div>
      )}

      {nonSystemVariables.map((variable) => (
        <InjectableInput
          key={variable.variableId}
          variableId={variable.variableId}
          label={variable.label}
          type={variable.type}
          value={values[variable.variableId]}
          error={errors[variable.variableId]}
          onChange={(value) => onChange(variable.variableId, value)}
          onGenerate={onGenerate ? () => onGenerate(variable.variableId) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
