import {
  Calendar,
  CheckSquare,
  Clock,
  Coins,
  Database,
  Hash,
  Image as ImageIcon,
  ListTree,
  Table,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InjectorType, Variable } from '../../types/variables'
import type { FormatConfig } from '../../types/injectable'
import {
  getVariables,
  filterVariables as storeFilterVariables,
} from '../../stores/injectables-store'

// Re-export types for backward compatibility
export type VariableType = InjectorType

export interface MentionVariable {
  id: string
  label: string
  type: VariableType
  formatConfig?: FormatConfig
  sourceType?: 'INTERNAL' | 'EXTERNAL'
  /** Grupo para categorización en el menú */
  group: 'variable'
}

export const VARIABLE_ICONS: Record<VariableType, LucideIcon> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  LIST: ListTree,
  ROLE_TEXT: Type,
}

// Icons for source type
export const SOURCE_TYPE_ICONS: Record<'INTERNAL' | 'EXTERNAL', LucideIcon> = {
  INTERNAL: Clock,
  EXTERNAL: Database,
}

/**
 * Map Variable to MentionVariable format
 */
function mapToMentionVariable(v: Variable): MentionVariable {
  return {
    id: v.variableId,
    label: v.label,
    type: v.type,
    formatConfig: v.formatConfig,
    sourceType: v.sourceType,
    group: 'variable',
  }
}

/**
 * Get all variables as MentionVariable format (from store)
 */
export function getMentionVariables(): MentionVariable[] {
  return getVariables().map(mapToMentionVariable)
}

/**
 * Filter variables by query and return as MentionVariable format
 */
export function filterVariables(query: string): MentionVariable[] {
  return storeFilterVariables(query).map(mapToMentionVariable)
}
