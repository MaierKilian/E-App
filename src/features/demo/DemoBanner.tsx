import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, X, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { resetAllStores } from '@/features/sync/stores'

/**
 * Schmaler Hinweisstreifen, solange die Beispiel-Wohnung (Demo-Modus) aktiv ist.
 *
 * Für abgemeldete Besucher (typischerweise aus der Landing Page) bietet er zwei
 * klare Wege: „Selbst loslegen" startet das eigene Onboarding, „Verlassen" kehrt
 * zur Landing Page zurück. Angemeldete Nutzer laden beim Verlassen neu, damit die
 * Cloud-Synchronisation ihr echtes Profil wiederherstellt.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const demoMode = useSettingsStore((s) => s.demoMode)
  const setDemoMode = useSettingsStore((s) => s.setDemoMode)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const user = useAuthStore((s) => s.user)

  if (!demoMode) return null

  // Aus der Demo heraus das eigene Profil beginnen (nur für Gäste sinnvoll).
  function startOwn() {
    setDemoMode(false)
    resetAllStores()
    setIntroSeen(true)
    navigate('/onboarding', { replace: true })
  }

  function exit() {
    setDemoMode(false)
    if (user) {
      // Angemeldet: neu laden → cloudSync holt das echte Profil zurück.
      window.location.reload()
    } else {
      // Gast: zurück zur Landing Page (Einführung wieder anbieten).
      resetAllStores()
      setIntroSeen(false)
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-3.5 py-2.5">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{t('demo.bannerLabel')}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {!user && (
            <button
              type="button"
              onClick={startOwn}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
            >
              {t('demo.startOwn')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={exit}
            className="focus-ring inline-flex items-center gap-1 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium text-foreground transition-transform active:scale-[0.97]"
          >
            <X className="h-3.5 w-3.5" />
            {t('demo.exit')}
          </button>
        </div>
      </div>
    </div>
  )
}
