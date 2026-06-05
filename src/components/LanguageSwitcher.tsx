import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'

/** Kompakter Umschalter zwischen den verfügbaren Sprachen (DE / EN). */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-semibold"
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`px-2.5 py-1.5 uppercase transition-colors ${
            current === lng
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:bg-surface-2'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
