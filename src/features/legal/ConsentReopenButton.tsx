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
      className="glass-floating focus-ring fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-30 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted shadow-md transition-colors hover:text-foreground md:bottom-4 md:right-4"
    >
      <Cookie className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {t('consent.reopen')}
    </button>
  )
}
