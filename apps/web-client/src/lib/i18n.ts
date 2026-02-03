import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'

/**
 * Supported languages
 */
export const supportedLanguages = ['en', 'es'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

/**
 * Language display names
 */
export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
}

/**
 * Initialize i18next
 */
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'doc-assembly-language',
    },

    defaultNS: 'translation',
    ns: ['translation'],
  })

/**
 * Change language
 */
export function changeLanguage(lng: SupportedLanguage): Promise<void> {
  return i18n.changeLanguage(lng).then(() => {
    document.documentElement.lang = lng
  })
}

/**
 * Get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  const current = i18n.language
  if (supportedLanguages.includes(current as SupportedLanguage)) {
    return current as SupportedLanguage
  }
  return 'en'
}

export default i18n
