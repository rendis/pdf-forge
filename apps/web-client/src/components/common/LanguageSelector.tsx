import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  supportedLanguages,
  languageNames,
  changeLanguage,
  type SupportedLanguage,
} from '@/lib/i18n'

const languageCodes: Record<SupportedLanguage, string> = {
  en: 'EN',
  es: 'ES',
}

export function LanguageSelector() {
  const { i18n, t } = useTranslation()
  const currentLang = (
    supportedLanguages.includes(i18n.language as SupportedLanguage)
      ? i18n.language
      : 'en'
  ) as SupportedLanguage

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none">
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t('common.changeLanguage', 'Change language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px] rounded-none">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t('common.language', 'Language')}
        </DropdownMenuLabel>
        {supportedLanguages.map((lang) => {
          const isActive = currentLang === lang
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => changeLanguage(lang as SupportedLanguage)}
              className={`flex items-center gap-3 rounded-none px-3 py-2 ${isActive ? 'bg-accent' : ''}`}
            >
              <span className="w-4">
                {isActive && <Check size={14} className="text-foreground" />}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {languageCodes[lang as SupportedLanguage]}
              </span>
              <span className={`text-sm ${isActive ? 'font-medium text-foreground' : ''}`}>
                {languageNames[lang as SupportedLanguage]}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
