import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { fade, quickTransition } from '@/lib/animations'
import type {
  LogicRule,
  RuleOperator,
  RuleValue,
} from '../ConditionalExtension'
import type { InjectorType } from '../../../types/variables'
import { useLogicBuilder } from './LogicBuilderContext'
import { RuleValueInput } from './RuleValueInput'
import { getOperatorsForType, operatorRequiresValue } from '../types/operators'

interface LogicRuleProps {
  rule: LogicRule
  parentId: string
}

export const LogicRuleItem = ({ rule, parentId }: LogicRuleProps) => {
  const { t } = useTranslation()
  const { removeNode, updateNode, variables } = useLogicBuilder()

  const { setNodeRef: setVarRef, isOver: isVarOver } = useDroppable({
    id: `rule-var-${rule.id}`,
    data: { type: 'field-drop', ruleId: rule.id, field: 'variableId' },
  })

  const selectedVar = variables.find((v) => v.id === rule.variableId)
  const variableType = (selectedVar?.type as InjectorType) || 'TEXT'
  const operatorOptions = selectedVar ? getOperatorsForType(variableType) : []
  const showValueInput = selectedVar && operatorRequiresValue(rule.operator)

  const handleOperatorChange = (op: RuleOperator) => {
    const updates: Partial<LogicRule> = { operator: op }
    if (!operatorRequiresValue(op)) {
      updates.value = { mode: 'text', value: '' }
    }
    updateNode(rule.id, updates)
  }

  const handleValueChange = (newValue: RuleValue) => {
    updateNode(rule.id, { value: newValue })
  }

  const normalizedValue: RuleValue =
    typeof rule.value === 'string'
      ? { mode: 'text', value: rule.value }
      : rule.value || { mode: 'text', value: '' }

  return (
    <motion.div
      layout
      className="flex flex-wrap items-center gap-1.5 p-2 rounded-sm bg-card border border-border group relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Variable (Droppable) - flexible width */}
      <div
        ref={setVarRef}
        className={cn(
          'h-8 px-2 rounded-sm border flex items-center text-xs transition-colors shrink-0',
          'min-w-[100px] max-w-[150px]',
          isVarOver
            ? 'border-foreground bg-muted ring-2 ring-foreground/20'
            : 'border-border bg-card',
          !rule.variableId && 'text-muted-foreground border-dashed'
        )}
      >
        {selectedVar ? (
          <span className="font-mono text-[10px] font-medium text-foreground bg-muted px-1.5 py-0.5 rounded-sm border border-border truncate">
            {selectedVar.label}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground truncate">{t('editor.conditional.dragVariable')}</span>
        )}
      </div>

      {/* Operator - compact */}
      <Select
        value={rule.operator}
        onValueChange={(val) => handleOperatorChange(val as RuleOperator)}
        disabled={!selectedVar}
      >
        <SelectTrigger className="w-[160px] h-8 shrink-0 border-input text-xs">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {operatorOptions.map((op) => {
            const Icon = op.icon
            return (
              <SelectItem key={op.value} value={op.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs">{t(op.labelKey)}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Value Input - grows to fill remaining space */}
      <AnimatePresence mode="wait">
        {showValueInput && (
          <motion.div
            key="value-input"
            className="flex-1 min-w-[120px] flex items-center"
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={quickTransition}
          >
            <RuleValueInput
              value={normalizedValue}
              onChange={handleValueChange}
              variableType={variableType}
              variables={variables}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Button - always visible on mobile, hover on desktop */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeNode(rule.id, parentId)}
        className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0 ml-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  )
}
