import type { FormatConfig } from './injectable'

/**
 * Injectable variable types supported by the editor
 * ROLE_TEXT: Variables de roles de firmantes (nombre, email, etc.)
 */
export type InjectorType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'CURRENCY'
  | 'BOOLEAN'
  | 'IMAGE'
  | 'TABLE'
  | 'LIST'
  | 'ROLE_TEXT'

/**
 * Table column metadata for TABLE type injectables
 * Contains i18n labels and data type information
 */
export interface TableColumnMeta {
  key: string
  labels: Record<string, string> // i18n: {"en": "Name", "es": "Nombre"}
  dataType: string
  width?: string
  format?: string
}

/**
 * Variable interface for frontend usage
 * Variables are fetched from API via useInjectables hook or injectables-store
 */
export interface Variable {
  id: string
  variableId: string
  label: string
  type: InjectorType
  description?: string
  formatConfig?: FormatConfig
  sourceType: 'INTERNAL' | 'EXTERNAL'
  metadata?: Record<string, unknown>
  group?: string
}
