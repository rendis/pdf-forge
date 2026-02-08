import type { TableStylesAttrs } from '../Table/types'

// TableInjector node attributes
export interface TableInjectorAttrs {
  // Variable reference
  variableId: string
  label: string
  // Language for i18n column labels
  lang?: string
  // Style overrides (user can customize even though content is dynamic)
  headerStyles?: Partial<TableStylesAttrs>
  bodyStyles?: Partial<TableStylesAttrs>
}

// Options for the TableInjector extension
export interface TableInjectorOptions {
  variableId?: string
  label?: string
  lang?: string
}
