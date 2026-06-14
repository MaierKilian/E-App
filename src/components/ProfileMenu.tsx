import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, X, Palette, Globe, PlayCircle, ChevronRight, Sun, Moon, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore, THEMES, type Theme } from '@/store/settingsStore'
import { SUPPORTED_LANGUAGES } from '@/i18n'

const THEME_ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  htw: Leaf,
}

/**
 * Zentraler Profil-/Einstellungs-Einstieg oben rechts. Bündelt Konto (Platzhalter
 * fürs künftige Login), Darstellung (Design + Sprache) und Hilfe in einem
 * Bottom-Sheet – statt mehrerer Schnellschalter in der Kopfzeile.
 */
export function ProfileMenu() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const currentLang = i18n.resolvedLanguage

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('settings.open')}
        aria-haspopup="dialog"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <User className="h-4.5 w-4.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t('settings.title')}
        >
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          <div className="glass relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 pb-8 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{t('settings.title')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="focus-ring grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Konto – Platzhalter fürs künftige Accountsystem */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <User className="h-5.5 w-5.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{t('settings.signIn')}</p>
                <p className="text-xs text-muted">{t('settings.accountHint')}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                {t('settings.soon')}
              </span>
            </div>

            {/* Darstellung */}
            <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              <Palette className="h-3.5 w-3.5" />
              {t('settings.appearance')}
            </p>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 px-1 text-sm font-medium text-foreground">{t('theme.label')}</p>
                <div className="flex gap-1.5 rounded-2xl border border-border bg-surface/50 p-1">
                  {THEMES.map((option) => {
                    const Icon = THEME_ICONS[option]
                    const active = option === theme
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setTheme(option)}
                        aria-pressed={active}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-surface-2'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(`theme.${option}`)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
                  <Globe className="h-3.5 w-3.5 text-muted" />
                  {t('language.label')}
                </p>
                <div className="flex gap-1.5 rounded-2xl border border-border bg-surface/50 p-1">
                  {SUPPORTED_LANGUAGES.map((lng) => {
                    const active = currentLang === lng
                    return (
                      <button
                        key={lng}
                        type="button"
                        onClick={() => void i18n.changeLanguage(lng)}
                        aria-pressed={active}
                        className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
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
              </div>
            </div>

            {/* Hilfe */}
            <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.help')}
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/onboarding')
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3 text-left transition-transform active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <PlayCircle className="h-5 w-5" />
              </span>
              <span className="flex-1 font-medium text-foreground">{t('settings.replayIntro')}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </button>

            <p className="mt-6 text-center text-[11px] text-muted">
              {t('app.name')} · v1.0
            </p>
          </div>
        </div>
      )}
    </>
  )
}
