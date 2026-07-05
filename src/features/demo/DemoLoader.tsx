import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { resetAllStores, hydrate } from '@/features/sync/stores'
import { buildDemoSnapshot } from './demoProfile'

/**
 * Lädt über den Link-Parameter `?demo` eine fertig befüllte Beispiel-Wohnung
 * in die lokalen Stores – ohne Konto, rein clientseitig. Vor dem Ersetzen der
 * aktuellen Ansicht wird kurz nachgefragt.
 *
 * Sicherheitsnetz: Nur für abgemeldete Betrachter. Angemeldete Nutzer würden
 * über die Cloud-Synchronisation ihr echtes Profil überschreiben – daher wird
 * ihnen stattdessen ein Hinweis gezeigt (bitte abmelden).
 */
export function DemoLoader() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const setDemoMode = useSettingsStore((s) => s.setDemoMode)
  const [dismissed, setDismissed] = useState(false)

  const wantsDemo = params.has('demo')
  // Warten bis der Auth-Status feststeht, damit wir angemeldete Nutzer sicher erkennen.
  if (!wantsDemo || initializing || dismissed) return null

  function clearParam() {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
  }

  function cancel() {
    setDismissed(true)
    clearParam()
  }

  function loadDemo() {
    resetAllStores()
    hydrate(buildDemoSnapshot())
    setIntroSeen(true) // Beispiel direkt zeigen, ohne Einführung
    setDemoMode(true) // Monitoring/Messungen/Berichte ohne Login sichtbar machen
    setDismissed(true)
    clearParam()
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-md sm:items-center">
      <div className="glass-floating animate-step-in w-full max-w-md rounded-3xl p-6 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          {user ? <Home className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
        </span>

        {user ? (
          <>
            <h2 className="text-lg font-bold text-foreground">{t('demo.loggedInTitle')}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t('demo.loggedInBody')}</p>
            <button
              type="button"
              onClick={cancel}
              className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t('demo.ok')}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground">{t('demo.title')}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t('demo.body')}</p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={loadDemo}
                className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
              >
                {t('demo.load')}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="focus-ring w-full rounded-2xl border border-border bg-surface py-3 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              >
                {t('demo.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
