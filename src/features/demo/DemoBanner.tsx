import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { resetAllStores } from '@/features/sync/stores'

/**
 * Schmaler Hinweisstreifen, solange die Beispiel-Wohnung (Demo-Modus) aktiv ist.
 * Über „Demo verlassen" kommt man zurück: Angemeldete Nutzer laden neu, damit die
 * Cloud-Synchronisation ihr echtes Profil wiederherstellt; abgemeldete Betrachter
 * setzen die lokalen Daten zurück.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const demoMode = useSettingsStore((s) => s.demoMode)
  const setDemoMode = useSettingsStore((s) => s.setDemoMode)
  const user = useAuthStore((s) => s.user)

  if (!demoMode) return null

  function exit() {
    setDemoMode(false)
    if (user) {
      // Angemeldet: neu laden → cloudSync holt das echte Profil zurück.
      window.location.reload()
    } else {
      resetAllStores()
      navigate('/onboarding', { replace: true })
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-3.5 py-2.5">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{t('demo.bannerLabel')}</span>
        </span>
        <button
          type="button"
          onClick={exit}
          className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
        >
          <X className="h-3.5 w-3.5" />
          {t('demo.exit')}
        </button>
      </div>
    </div>
  )
}
