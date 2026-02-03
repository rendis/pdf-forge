import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeSlideUp, quickTransition } from '@/lib/animations'
import type {
  LogicGroup,
  LogicRule,
  ConditionalSchema,
  RuleValue,
} from '../ConditionalExtension'
import { OPERATOR_SYMBOLS } from '../types/operators'
import { useLogicBuilder } from './LogicBuilderContext'

interface FormulaSummaryProps {
  schema: ConditionalSchema
  className?: string
}

export function FormulaSummary({ schema, className }: FormulaSummaryProps) {
  const { t } = useTranslation()
  const { variables } = useLogicBuilder()

  // Genera el resumen de fórmula
  const summary = useMemo(() => {
    const generateRuleSummary = (rule: LogicRule): string => {
      if (!rule.variableId) return '(?)'

      const variable = variables.find((v) => v.id === rule.variableId)
      const varName = variable?.label || rule.variableId
      const opSymbol = OPERATOR_SYMBOLS[rule.operator] || rule.operator

      // Operadores sin valor
      if (
        ['empty', 'not_empty', 'is_true', 'is_false'].includes(rule.operator)
      ) {
        return `${varName} ${opSymbol}`
      }

      // Normalizar valor (compatibilidad con formato antiguo)
      const ruleValue: RuleValue =
        typeof rule.value === 'string'
          ? { mode: 'text', value: rule.value }
          : rule.value || { mode: 'text', value: '' }

      // Con valor
      let valueDisplay: string
      if (ruleValue.mode === 'variable') {
        const valueVar = variables.find((v) => v.id === ruleValue.value)
        valueDisplay = `{${valueVar?.label || ruleValue.value || '?'}}`
      } else {
        valueDisplay = ruleValue.value ? `"${ruleValue.value}"` : '?'
      }

      return `${varName} ${opSymbol} ${valueDisplay}`
    }

    const generateGroupSummary = (group: LogicGroup): string => {
      if (group.children.length === 0) return t('editor.conditional.empty')

      const childSummaries = group.children.map((child) => {
        if (child.type === 'rule') {
          return generateRuleSummary(child as LogicRule)
        }
        return generateGroupSummary(child as LogicGroup)
      })

      const joined = childSummaries.join(` ${group.logic} `)
      return group.children.length > 1 ? `(${joined})` : joined
    }

    return generateGroupSummary(schema)
  }, [schema, variables, t])

  const isEmpty = schema.children.length === 0

  return (
    <motion.div
      className={cn(
        'flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50',
        className
      )}
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
      transition={quickTransition}
    >
      <Code className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">{t('editor.conditional.formula')}</div>
        <motion.code
          key={summary}
          className={cn(
            'text-sm font-mono break-all',
            isEmpty ? 'text-muted-foreground italic' : 'text-foreground'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {isEmpty ? t('editor.conditional.alwaysVisibleNoConditions') : summary}
        </motion.code>
      </div>
    </motion.div>
  )
}
