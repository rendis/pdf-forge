/**
 * Injectable group definition from API with i18n names.
 */
export interface InjectableGroup {
  /** Unique identifier for the group (e.g., 'datetime', 'tables') */
  key: string
  /** i18n display names: {"en": "Date/Time", "es": "Fecha/Hora"} */
  name: Record<string, string>
  /** Lucide icon name to display (e.g., 'calendar', 'table') */
  icon: string
  /** Display order (lower numbers appear first) */
  order: number
}

/**
 * Resolved group with string name for current locale.
 */
export interface ResolvedGroup {
  key: string
  name: string
  icon: string
  order: number
}
