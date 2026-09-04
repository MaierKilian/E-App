import { useTranslation } from 'react-i18next'
import { Cookie } from 'lucide-react'
import { useConsentStore, useNeedsConsent } from './consent'

/**
 * Kleiner, dauerhaft eingeblendeter Wiedereinstieg in die Cookie-Einstellungen.
 *
 * Solange noch keine Entscheidung vorliegt, übernimmt der {@link ConsentBanner}
 * diese Rolle – der Reopen-Button erscheint erst danach, an derselben Stelle
 * (unten rechts), damit der Widerruf genauso leicht erreichbar bleibt wie die
 * ursprüngliche Erteilung (Art. 7 Abs. 3 Satz 4 DSGVO), ohne bis zur
 * Datenschutzerklärung oder Fußzeile scrollen zu müssen.
 *
 * Auf dem Handy steht nur das Cookie-Symbol: Die ausgeschriebene Frage
 * („Möchtest du deine Cookie-Einstellungen ändern?") ergab eine Leiste über
 * fast die ganze Bildschirmbreite, die dauerhaft über den Inhalt und die
 * Navigationsleiste lief. Der zugängliche Name bleibt derselbe Satz
 * (`aria-label`/`title`), die Trefferfläche mit 2.75rem über der 44-px-Marke –
 * für Screenreader und Tastatur ändert sich also nichts. Ab `md` (keine
 * Navigationsleiste, viel freier Rand) steht die Beschriftung wieder dabei,
 * dort aber als Handlungsaufforderung („Cookie-Einstellungen") statt als Frage.
 */
export function ConsentReopenButton() {
  const { t } = useTranslation()
  const needsDecision = useNeedsConsent()
  const settingsOpen = useConsentStore((s) => s.settingsOpen)
  const openSettings = useConsentStore((s) => s.openSettings)

  if (needsDecision || settingsOpen) return null

  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label={t('consent.reopen')}
      title={t('consent.reopen')}
      // Abstand nach unten aus --floating-bottom, damit er sich nie mit der
      // BottomNav überschneidet (gemeinsame Maßzahl, siehe index.css).
      className="glass-floating focus-ring fixed bottom-[var(--floating-bottom)] right-3 z-30 flex h-11 w-11 items-center justify-center rounded-full text-muted shadow-md transition-colors hover:text-foreground md:h-auto md:w-auto md:gap-1.5 md:px-3 md:py-2 md:text-xs md:font-medium md:right-4"
    >
      <Cookie className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" aria-hidden="true" />
      <span className="hidden md:inline">{t('consent.settings')}</span>
    </button>
  )
}
