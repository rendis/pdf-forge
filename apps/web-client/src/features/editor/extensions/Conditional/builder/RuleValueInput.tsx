import { Type, Variable } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { fade, quickTransition } from '@/lib/animations'
import type { RuleValue, RuleValueMode } from '../ConditionalExtension'
import type { InjectorType } from '../../../types/variables'

interface RuleValueInputProps {
  value: RuleValue
  onChange: (value: RuleValue) => void
  variableType: InjectorType
  variables: { id: string; label: string; type: InjectorType }[]
  disabled?: boolean
  placeholder?: string
}

export function RuleValueInput({
  value,
  onChange,
  variableType,
  variables,
  disabled = false,
  placeholder,
}: RuleValueInputProps) {
  const { t } = useTranslation()
  const isTextMode = value.mode === 'text'
  const effectivePlaceholder = placeholder || t('editor.conditional.value')

  // Filtrar variables del mismo tipo
  const compatibleVariables = variables.filter((v) => v.type === variableType)

  const handleModeToggle = () => {
    const newMode: RuleValueMode = isTextMode ? 'variable' : 'text'
    onChange({
      mode: newMode,
      value: '',
    })
  }

  const handleValueChange = (newValue: string) => {
    onChange({ ...value, value: newValue })
  }

  // Input específico según tipo de variable
  const renderTextInput = () => {
    if (variableType === 'BOOLEAN') {
      return (
        <Select
          value={value.value}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1 h-8 border-input">
            <SelectValue placeholder={t('editor.conditional.select')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t('editor.conditional.true')}</SelectItem>
            <SelectItem value="false">{t('editor.conditional.false')}</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (variableType === 'DATE') {
      return (
        <Input
          type="date"
          value={value.value}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          className="flex-1 h-8 border-input"
        />
      )
    }

    if (variableType === 'NUMBER' || variableType === 'CURRENCY') {
      return (
        <Input
          type="number"
          value={value.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={effectivePlaceholder}
          disabled={disabled}
          className="flex-1 h-8 border-input"
        />
      )
    }

    // TEXT por defecto
    return (
      <Input
        value={value.value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={effectivePlaceholder}
        disabled={disabled}
        className="flex-1 h-8 border-input"
      />
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-1">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleModeToggle}
        disabled={disabled}
        title={isTextMode ? t('editor.conditional.switchToVariable') : t('editor.conditional.switchToLiteral')}
      >
        {isTextMode ? (
          <Type className="h-3.5 w-3.5" />
        ) : (
          <Variable className="h-3.5 w-3.5 text-foreground" />
        )}
      </Button>

      {/* Animated Content */}
      <AnimatePresence mode="wait">
        {isTextMode ? (
          <motion.div
            key="text-input"
            className="flex-1"
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={quickTransition}
          >
            {renderTextInput()}
          </motion.div>
        ) : (
          <motion.div
            key="variable-select"
            className="flex-1"
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={quickTransition}
          >
            <Select
              value={value.value}
              onValueChange={handleValueChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 border-input">
                <SelectValue placeholder={t('editor.conditional.selectVariable')} />
              </SelectTrigger>
              <SelectContent>
                {compatibleVariables.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t('editor.conditional.noVariablesOfType', { type: variableType })}
                  </div>
                ) : (
                  compatibleVariables.map((variable) => (
                    <SelectItem key={variable.id} value={variable.id}>
                      {variable.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
