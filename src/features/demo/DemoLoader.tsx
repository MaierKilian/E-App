import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { enterDemo, wantsDemo } from './enterDemo'

/**
 * Lädt über den Link-Parameter `?demo` eine fertig befüllte Beispiel-Wohnung
 * in die lokalen Stores – ohne Konto, rein clientseitig. Vor dem Ersetzen der
 * aktuellen Ansicht wird kurz nachgefragt.
 *
 * **Der Dialog schickt niemanden woanders hin.** Er legt sich über die
 * angefragte Seite; nach dem Laden steht der Besucher genau dort. Wer
 * `…/measurements/lighting?demo` öffnet, landet im LED-Check. Bis zum
 * 06.09.2026 navigierte diese Komponente danach fest auf `/onboarding` –
 * damit war jeder Link auf einen einzelnen Bereich wirkungslos, obwohl
 * `?demo` an jeder Route funktioniert. Die schriftliche Ausarbeitung verweist
 * genau so auf einzelne Checks (`docs/hausarbeit-verlinkung.md`). Die zweite
 * Hälfte dieser Kette steht in `FirstVisitGate` (`app/App.tsx`): Sie lässt
 * einen `?demo`-Aufruf durch, statt einen Erst-Besucher vorher auf die
 * Landing Page umzuleiten.
 *
 * Auch für angemeldete Nutzer sicher: Solange der Demo-Modus aktiv ist, pausiert
 * die Cloud-Synchronisation (siehe cloudSync), sodass das echte Profil weder
 * überschrieben noch hochgeladen wird. Über „Verlassen" kommt man zurück.
 */
export function DemoLoader() {
  const { t } = useTranslation()
  const [, setParams] = useSearchParams()
  const demoMode = useSettingsStore((s) => s.demoMode)
  // Den ?demo-Wunsch beim allerersten Render festhalten: die Index-Weiterleitung
  // (/ → /onboarding) verwirft den Query-Parameter, bevor wir sonst reagieren
  // könnten. Deshalb einmalig einlesen und merken.
  const [requested] = useState(() => wantsDemo(window.location.search))
  const [dismissed, setDismissed] = useState(false)

  // Läuft die Beispiel-Wohnung schon, gibt es nichts zu fragen: Der zweite
  // Link aus derselben PDF soll direkt seine Ansicht zeigen, statt dieselbe
  // Bestätigung noch einmal zu verlangen. Ein erneutes Laden würde zudem den
  // Stand verwerfen, den der Besucher sich gerade angesehen hat.
  if (!requested || dismissed || demoMode) return null

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
    // Bewusst ohne `navigate`: Der Besucher bleibt auf der Adresse, die er
    // angefragt hat. Vom Startpfad „/" führt die Wiederkehrer-Weiche in
    // `LandingRoute` von selbst weiter aufs Zuhause – wo ein Wiederkehrer
    // landet, entscheidet sie, nicht dieser Dialog.
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
