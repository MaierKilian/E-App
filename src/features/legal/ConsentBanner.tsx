import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Cookie } from 'lucide-react'
import { useConsentStore, useNeedsConsent } from './consent'

/**
 * Einwilligungs-Hinweis („Cookie-Banner").
 *
 * Gestaltungs-Entscheidungen, die alle rechtlich begründet sind:
 *
 * 1. **Kein Overlay, keine Sperre.** Der Hinweis liegt als schwebende Karte
 *    unten und lässt die App bedienbar. Ein Blocker wäre nicht nötig – ohne
 *    Einwilligung wird schlicht nichts geladen – und würde die Nutzung stören.
 * 2. **„Ablehnen" und „Akzeptieren" sind identisch gestaltet**: gleiche Größe,
 *    gleiche Farbe, gleiches Gewicht, nebeneinander auf einer Ebene. Ein
 *    farbig hervorgehobenes „Akzeptieren" neben einem blassen „Ablehnen" wäre
 *    ein Dark Pattern und macht die Einwilligung unwirksam (keine „freiwillige"
 *    Willensbekundung, Art. 4 Nr. 11 DSGVO).
 * 3. **Kein Schließen ohne Entscheidung**, aber auch kein Zwang: Es gibt kein
 *    „X", das den Hinweis wegräumt, ohne dass eine Wahl gespeichert wird –
 *    Wegklicken ist keine Einwilligung. Wer nichts entscheidet, bekommt
 *    schlicht keine Statistik.
 * 4. **Widerruf ist genauso leicht** wie die Erteilung: derselbe Dialog ist
 *    dauerhaft über die Fußzeile und die Einstellungen erreichbar.
 */
export function ConsentBanner() {
  const { t } = useTranslation()
  const needsDecision = useNeedsConsent()
  const settingsOpen = useConsentStore((s) => s.settingsOpen)
  const acceptAll = useConsentStore((s) => s.acceptAll)
  const rejectAll = useConsentStore((s) => s.rejectAll)
  const openSettings = useConsentStore((s) => s.openSettings)

  // Solange das Detail-Fenster offen ist, tritt der Hinweis zurück – sonst
  // stünden zwei Entscheidungswege gleichzeitig im Bild.
  if (!needsDecision || settingsOpen) return null

  return (
    <div
      // Über der unteren Navigationsleiste (z-20), damit beides bedienbar
      // bleibt; auf Desktop schwebt die Karte unten rechts.
      className="fixed inset-x-0 bottom-[var(--floating-bottom)] z-30 px-3 md:left-auto md:right-4 md:px-0"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
    >
      <div className="glass-floating animate-step-in mx-auto w-full max-w-md rounded-3xl p-4 md:mx-0">
        <p id="consent-banner-title" className="flex items-center gap-2 font-semibold text-foreground">
          <Cookie className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          {t('consent.banner.title')}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('consent.banner.text')}</p>

        {/* Gleichwertige Wahl: identische Klassen für beide Schaltflächen. */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={rejectAll}
            className="focus-ring rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            {t('consent.reject')}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="focus-ring rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            {t('consent.accept')}
          </button>
        </div>

        {/* Erweiterte Einstellungen genauso greifbar wie die beiden Optionen
            darüber – kein blasser Link, sondern ein eigener Button über die
            volle gemeinsame Breite. */}
        <button
          type="button"
          onClick={openSettings}
          className="focus-ring mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          {t('consent.settings')}
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <Link
            to="/datenschutz"
            className="focus-ring rounded underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {t('legal.privacy')}
          </Link>
          <Link
            to="/impressum"
            className="focus-ring rounded underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {t('legal.imprint')}
          </Link>
        </div>
      </div>
    </div>
  )
}
