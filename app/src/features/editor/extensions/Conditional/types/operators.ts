import type { LucideIcon } from 'lucide-react'
import {
  Equal,
  EqualNot,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Search,
  Circle,
  CircleDot,
  TextCursor,
  TextCursorInput,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from 'lucide-react'
import type { InjectorType } from '../../../types/variables'
import type { RuleOperator } from '../ConditionalExtension'

// Operadores que NO requieren valor
export const NO_VALUE_OPERATORS: RuleOperator[] = [
  'empty',
  'not_empty',
  'is_true',
  'is_false',
]

// Mapeo de tipos a operadores disponibles
export const TYPE_OPERATORS: Record<InjectorType, RuleOperator[]> = {
  TEXT: [
    'eq',
    'neq',
    'starts_with',
    'ends_with',
    'contains',
    'empty',
    'not_empty',
  ],
  NUMBER: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  CURRENCY: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  DATE: ['eq', 'neq', 'before', 'after', 'empty', 'not_empty'],
  BOOLEAN: ['eq', 'neq', 'is_true', 'is_false', 'empty', 'not_empty'],
  IMAGE: ['empty', 'not_empty'],
  TABLE: ['empty', 'not_empty'],
  ROLE_TEXT: [
    'eq',
    'neq',
    'starts_with',
    'ends_with',
    'contains',
    'empty',
    'not_empty',
  ],
}

// Definición de operador con etiqueta e icono
export interface OperatorDefinition {
  value: RuleOperator
  labelKey: string
  icon: LucideIcon
  requiresValue: boolean
}

// Definiciones completas de operadores
export const OPERATOR_DEFINITIONS: OperatorDefinition[] = [
  // Comunes
  { value: 'eq', labelKey: 'editor.conditional.operators.equals', icon: Equal, requiresValue: true },
  { value: 'neq', labelKey: 'editor.conditional.operators.notEquals', icon: EqualNot, requiresValue: true },
  { value: 'empty', labelKey: 'editor.conditional.operators.isEmpty', icon: Circle, requiresValue: false },
  {
    value: 'not_empty',
    labelKey: 'editor.conditional.operators.isNotEmpty',
    icon: CircleDot,
    requiresValue: false,
  },

  // TEXT
  { value: 'contains', labelKey: 'editor.conditional.operators.contains', icon: Search, requiresValue: true },
  {
    value: 'starts_with',
    labelKey: 'editor.conditional.operators.startsWith',
    icon: TextCursor,
    requiresValue: true,
  },
  {
    value: 'ends_with',
    labelKey: 'editor.conditional.operators.endsWith',
    icon: TextCursorInput,
    requiresValue: true,
  },

  // NUMBER/CURRENCY
  { value: 'gt', labelKey: 'editor.conditional.operators.greaterThan', icon: ChevronRight, requiresValue: true },
  { value: 'lt', labelKey: 'editor.conditional.operators.lessThan', icon: ChevronLeft, requiresValue: true },
  {
    value: 'gte',
    labelKey: 'editor.conditional.operators.greaterOrEqual',
    icon: ChevronsRight,
    requiresValue: true,
  },
  {
    value: 'lte',
    labelKey: 'editor.conditional.operators.lessOrEqual',
    icon: ChevronsLeft,
    requiresValue: true,
  },

  // DATE
  { value: 'before', labelKey: 'editor.conditional.operators.isBefore', icon: ArrowLeft, requiresValue: true },
  { value: 'after', labelKey: 'editor.conditional.operators.isAfter', icon: ArrowRight, requiresValue: true },

  // BOOLEAN
  { value: 'is_true', labelKey: 'editor.conditional.operators.isTrue', icon: Check, requiresValue: false },
  { value: 'is_false', labelKey: 'editor.conditional.operators.isFalse', icon: X, requiresValue: false },
]

// Mapa para acceso rápido
const operatorMap = new Map(OPERATOR_DEFINITIONS.map((op) => [op.value, op]))

// Helper para obtener definición de operador
export const getOperatorDef = (
  op: RuleOperator
): OperatorDefinition | undefined => operatorMap.get(op)

// Helper para verificar si operador requiere valor
export const operatorRequiresValue = (op: RuleOperator): boolean =>
  !NO_VALUE_OPERATORS.includes(op)

// Helper para obtener operadores de un tipo
export const getOperatorsForType = (type: InjectorType): OperatorDefinition[] => {
  const ops = TYPE_OPERATORS[type] || []
  return ops
    .map((op) => operatorMap.get(op))
    .filter((def): def is OperatorDefinition => def !== undefined)
}

// Símbolos para el resumen de fórmula
export const OPERATOR_SYMBOLS: Record<RuleOperator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  contains: '∋',
  starts_with: '^=',
  ends_with: '$=',
  empty: '∅',
  not_empty: '!∅',
  before: '<',
  after: '>',
  is_true: '= ✓',
  is_false: '= ✗',
}
