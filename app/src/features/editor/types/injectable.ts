import type { InjectorType, Variable } from './variables'
import type { InjectableGroup } from './injectable-group'
import { resolveI18n } from './i18n-resolve'

// ============================================
// Internal Injectable Constants
// ============================================

/**
 * Keys for system-calculated injectables (sourceType='INTERNAL')
 * These can be auto-filled during preview
 */
export const INTERNAL_INJECTABLE_KEYS = [
  'date_time_now',
  'date_now',
  'time_now',
  'year_now',
  'month_now',
  'day_now',
] as const

export type InternalInjectableKey = (typeof INTERNAL_INJECTABLE_KEYS)[number]

/**
 * Check if a key is an internal (auto-calculable) injectable
 */
export function isInternalKey(key: string): key is InternalInjectableKey {
  return INTERNAL_INJECTABLE_KEYS.includes(key as InternalInjectableKey)
}

// ============================================
// Format Config Type
// ============================================

/**
 * Format configuration from backend API
 * Contains available format options and default selection
 */
export interface FormatConfig {
  /** Default format to apply */
  default: string
  /** Available format options for user selection */
  options: string[]
}

// ============================================
// Format Config Helper Functions
// ============================================

/**
 * Check if formatConfig has configurable options (more than one option)
 */
export function hasConfigurableOptions(formatConfig?: FormatConfig): boolean {
  return Boolean(
    formatConfig?.options &&
      Array.isArray(formatConfig.options) &&
      formatConfig.options.length > 1
  )
}

/**
 * Get default format from formatConfig
 */
export function getDefaultFormat(
  formatConfig?: FormatConfig
): string | undefined {
  return formatConfig?.default
}

/**
 * Get available formats from formatConfig
 */
export function getAvailableFormats(formatConfig?: FormatConfig): string[] {
  return formatConfig?.options ?? []
}

// ============================================
// Injectable Types
// ============================================

/**
 * Injectable definition from API
 */
export interface Injectable {
  id: string
  workspaceId: string
  key: string
  label: Record<string, string>
  dataType: InjectorType
  description?: Record<string, string>
  isGlobal: boolean
  sourceType: 'INTERNAL' | 'EXTERNAL'
  formatConfig?: FormatConfig
  metadata?: Record<string, unknown>
  group?: string
  createdAt: string
  updatedAt?: string
}

/**
 * List injectables response from API
 */
export interface InjectablesListResponse {
  items: Injectable[]
  groups: InjectableGroup[]
  total: number
}

/**
 * Convert API Injectable to frontend Variable format, resolving i18n labels.
 */
export function mapInjectableToVariable(injectable: Injectable, locale: string): Variable {
  return {
    id: injectable.id,
    variableId: injectable.key,
    label: resolveI18n(injectable.label, locale, injectable.key),
    type: injectable.dataType,
    description: resolveI18n(injectable.description, locale),
    formatConfig: injectable.formatConfig,
    sourceType: injectable.sourceType,
    metadata: injectable.metadata,
    group: injectable.group,
  }
}

/**
 * Convert array of Injectables to Variables, resolving i18n labels.
 */
export function mapInjectablesToVariables(injectables: Injectable[], locale: string): Variable[] {
  return injectables.map((inj) => mapInjectableToVariable(inj, locale))
}

/**
 * Check if an injectable is internal (system-calculated)
 */
export function isInternalInjectable(injectable: Injectable): boolean {
  return injectable.sourceType === 'INTERNAL'
}
