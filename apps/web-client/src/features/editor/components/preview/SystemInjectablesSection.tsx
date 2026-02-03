import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { Variable } from '../../types/variables'
import type {
  InjectableFormValues,
  InjectableFormErrors,
} from '../../types/preview'
import { InjectableInput } from './InjectableInput'

interface SystemInjectablesSectionProps {
  variables: Variable[]
  values: InjectableFormValues
  errors: InjectableFormErrors
  touchedFields: Set<string>
  onChange: (variableId: string, value: unknown) => void
  onResetToEmulated: (variableId: string) => void
  disabled?: boolean
}

export function SystemInjectablesSection({
  variables,
  values,
  errors,
  touchedFields,
  onChange,
  onResetToEmulated,
  disabled = false,
}: SystemInjectablesSectionProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (variables.length === 0) {
    return null
  }

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={(newOpen) => setIsCollapsed(!newOpen)}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {t('editor.preview.systemVariables')}
        </h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="space-y-4 bg-muted/30 p-3 rounded-sm border border-border">
          <p className="text-xs text-muted-foreground">
            {t('editor.preview.systemVariablesHelp')}
          </p>
          {variables.map((variable) => (
            <InjectableInput
              key={variable.variableId}
              variableId={variable.variableId}
              label={variable.label}
              type={variable.type}
              value={values[variable.variableId]}
              error={errors[variable.variableId]}
              onChange={(value) => onChange(variable.variableId, value)}
              isEmulated={!touchedFields.has(variable.variableId)}
              onResetToEmulated={() => onResetToEmulated(variable.variableId)}
              disabled={disabled}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
