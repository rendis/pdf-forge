/**
 * Injectable group definition for visual organization in the editor panel.
 * Groups come from the backend API response.
 */
export interface InjectableGroup {
  /** Unique identifier for the group (e.g., 'datetime', 'tables') */
  key: string
  /** Display name resolved for the current locale */
  name: string
  /** Lucide icon name to display (e.g., 'calendar', 'table') */
  icon: string
  /** Display order (lower numbers appear first) */
  order: number
}
