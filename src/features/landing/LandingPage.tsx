import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Play } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Öffentliche Landing Page (Route „/") für Erst-Besucher.
 *
 * Ziel: in Sekunden überzeugen – was die App kann, wofür sie gut ist und wie es
 * aussieht, wenn schon Daten drin sind. Bewusst OHNE die App-Chrome (Header /
 * BottomNav); eigene schlanke Topbar. Wiederkehrer werden bereits in `App.tsx`
 * an dieser Seite vorbei aufs Onboarding/Dashboard geleitet.
 *
 * Aufbau folgt `docs/landing-concept.md`:
 *   ① Hero · ② „So sieht's mit Daten aus" · ③ Capabilities · ④ Vertrauen · ⑤ CTA
 * In diesem Schritt ist nur das Gerüst + Hero angelegt; die weiteren Abschnitte
 * und die i18n-Anbindung folgen in den nächsten Schritten.
 */
export function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)

  // Beim Verlassen der Landing gilt die Einführung als gesehen: die Landing
  // übernimmt die Rolle des Value-Intros. Dadurch überspringt der normale Flow
  // das alte Overlay (dessen Verbleib ist eine spätere Entscheidung).
  function startOnboarding() {
    setIntroSeen(true)
    navigate('/onboarding')
  }

  function goToLogin() {
    setIntroSeen(true)
    navigate('/login', { state: { from: '/onboarding' } })
  }

  // Demo lädt über den vorhandenen `?demo`-Mechanismus (DemoLoader). Ein voller
  // Seitenwechsel ist nötig, weil DemoLoader den Query-Parameter nur beim Mount
  // liest. Feinschliff (nahtloses Laden) folgt in einem späteren Schritt.
  function openDemo() {
    window.location.assign(`${import.meta.env.BASE_URL}?demo`)
  }

  return (
    <div className="relative min-h-[100dvh] text-foreground">
      <div className="app-backdrop" aria-hidden="true" />

      {/* Schlanke Topbar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span>E-App</span>
        </span>
        <button
          type="button"
          onClick={goToLogin}
          className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('landing.nav.signIn')}
        </button>
      </header>

      {/* ① Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-16 pt-10 text-center md:pt-16">
        <h1 className="max-w-2xl text-balance text-3xl font-bold leading-tight text-foreground md:text-5xl">
          {t('landing.hero.title')}
        </h1>
        <p className="mt-4 max-w-xl text-balance text-base text-muted md:text-lg">
          {t('landing.hero.subtitle')}
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={startOnboarding}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
          >
            {t('landing.hero.ctaStart')}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openDemo}
            className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
          >
            <Play className="h-4 w-4" />
            {t('landing.hero.ctaDemo')}
          </button>
        </div>
      </section>

      {/* ② „So sieht's mit Daten aus" – folgt in einem späteren Schritt */}
      {/* ③ Was du machen kannst – folgt */}
      {/* ④ Vertrauen / Für wen – folgt */}
      {/* ⑤ Abschluss-CTA – folgt */}
    </div>
  )
}
