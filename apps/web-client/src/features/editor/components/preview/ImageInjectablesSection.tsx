import { useTranslation } from 'react-i18next'
import { ImageInjectableInput } from './ImageInjectableInput'
import type { Variable } from '../../types/variables'
import type { InjectableFormValues, InjectableFormErrors } from '../../types/preview'

interface ImageInjectablesSectionProps {
  variables: Variable[]
  values: InjectableFormValues
  errors: InjectableFormErrors
  onChange: (variableId: string, value: unknown) => void
  disabled?: boolean
}

export function ImageInjectablesSection({
  variables,
  values,
  errors,
  onChange,
  disabled,
}: ImageInjectablesSectionProps) {
  const { t } = useTranslation()

  if (variables.length === 0) return null

  return (
    <div>
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
        {t('editor.preview.imageVariables')}
      </h2>
      <div className="space-y-4">
        {variables.map((variable) => (
          <ImageInjectableInput
            key={variable.variableId}
            variable={variable}
            value={values[variable.variableId] as string | undefined}
            error={errors[variable.variableId]}
            onChange={(val) => onChange(variable.variableId, val)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
