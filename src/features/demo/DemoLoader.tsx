import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { enterDemo } from './enterDemo'

/**
 * Lädt über den Link-Parameter `?demo` eine fertig befüllte Beispiel-Wohnung
 * in die lokalen Stores – ohne Konto, rein clientseitig. Vor dem Ersetzen der
 * aktuellen Ansicht wird kurz nachgefragt.
 *
 * Auch für angemeldete Nutzer sicher: Solange der Demo-Modus aktiv ist, pausiert
 * die Cloud-Synchronisation (siehe cloudSync), sodass das echte Profil weder
 * überschrieben noch hochgeladen wird. Über „Verlassen" kommt man zurück.
 */
export function DemoLoader() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [, setParams] = useSearchParams()
  // Den ?demo-Wunsch beim allerersten Render festhalten: die Index-Weiterleitung
  // (/ → /onboarding) verwirft den Query-Parameter, bevor wir sonst reagieren
  // könnten. Deshalb einmalig einlesen und merken.
  const [wantsDemo] = useState(() => new URLSearchParams(window.location.search).has('demo'))
  const [dismissed, setDismissed] = useState(false)

  if (!wantsDemo || dismissed) return null

  function finish() {
    setDismissed(true)
    // Falls der Parameter noch in der URL steht, entfernen.
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('demo')
        return next
      },
      { replace: true },
    )
  }

  function cancel() {
    finish()
  }

  function loadDemo() {
    enterDemo()
    finish()
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-md sm:items-center">
      <div className="glass-floating animate-step-in w-full max-w-md rounded-3xl p-6 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </span>
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
      </div>
    </div>
  )
}
