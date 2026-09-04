import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Palette } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { ThemePicker } from '@/components/ThemePicker'

/**
 * Sprache und Design bereits auf der Landing Page einstellbar – bisher waren
 * beide erst nach der Anmeldung erreichbar (Einstellungsseite/Konto-Popover),
 * obwohl ein Erstbesucher sie sofort will. Zwei kompakte Dropdown-Buttons in
 * der Topbar, gleich bedienbar auf Desktop wie Mobile. `ThemePicker compact`
 * ist dieselbe Komponente wie im Konto-Popover – für einen schmalen Slot ist
 * sie bereits gebaut.
 */
export function LandingPickers() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language.startsWith('en') ? 'en' : 'de'

  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!langOpen) return
    function onClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  const [themeOpen, setThemeOpen] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!themeOpen) return
    function onClick(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setThemeOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [themeOpen])

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative" ref={langRef}>
        <button
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={langOpen}
          aria-label={t('language.label')}
          title={t('language.label')}
          className="focus-ring flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          {currentLang.toUpperCase()}
        </button>
        {langOpen && (
          <div
            role="menu"
            className="absolute left-1/2 z-30 mt-2 w-36 -translate-x-1/2 rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
          >
            {SUPPORTED_LANGUAGES.map((lng) => {
              const active = currentLang === lng
              return (
                <button
                  key={lng}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void i18n.changeLanguage(lng)
                    setLangOpen(false)
                  }}
                  aria-pressed={active}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  {t(`language.${lng}`)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="relative" ref={themeRef}>
        <button
          type="button"
          onClick={() => setThemeOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={themeOpen}
          aria-label={t('theme.label')}
          title={t('theme.label')}
          className="focus-ring flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          <Palette className="h-3.5 w-3.5 text-primary" />
        </button>
        {themeOpen && (
          <div
            role="menu"
            className="absolute left-1/2 z-30 mt-2 w-56 -translate-x-1/2 rounded-2xl border border-border bg-surface p-3 shadow-xl"
          >
            <ThemePicker compact />
          </div>
        )}
      </div>
    </div>
  )
}
