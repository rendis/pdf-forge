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
import type { InjectableFormValues } from '../../types/preview'
import type { ListInputValue } from '../../types/list-input'
import { ListDataInput } from './ListDataInput'

interface ListInjectablesSectionProps {
  variables: Variable[]
  values: InjectableFormValues
  onChange: (variableId: string, value: unknown) => void
  disabled?: boolean
}

export function ListInjectablesSection({
  variables,
  values,
  onChange,
  disabled = false,
}: ListInjectablesSectionProps) {
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
          {t('editor.preview.listSection', 'Lists')}
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
          {variables.map((variable, index) => {
            const listValue = values[variable.variableId] as ListInputValue | undefined

            return (
              <div key={variable.variableId}>
                <ListDataInput
                  variableId={variable.variableId}
                  label={variable.label}
                  value={listValue}
                  onChange={(value) => onChange(variable.variableId, value)}
                  disabled={disabled}
                />
                {index < variables.length - 1 && (
                  <div className="border-t pt-3 mt-3" />
                )}
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
