/**
 * Resolve a localized string from an i18n map.
 * Fallback chain: locale → "en" → "es" → first available → fallback
 */
export function resolveI18n(
  map_: Record<string, string> | undefined | null,
  locale: string,
  fallback: string = ''
): string {
  if (!map_) return fallback
  if (map_[locale]) return map_[locale]
  if (map_['en']) return map_['en']
  if (map_['es']) return map_['es']
  const values = Object.values(map_)
  return values.length > 0 ? values[0] : fallback
}
