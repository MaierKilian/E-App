import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useConsentStore } from './consent'

/**
 * Fußzeile mit den Pflichtlinks.
 *
 * Impressum und Datenschutzerklärung müssen von jeder Seite aus mit maximal
 * zwei Klicks („leichte Erkennbarkeit und unmittelbare Erreichbarkeit",
 * § 5 DDG) zu erreichen sein – deshalb liegt diese Zeile im App-Grundgerüst
 * und zusätzlich am Ende der Landing Page.
 *
 * Der dritte Link öffnet die Einwilligungs-Einstellungen. Der Widerruf muss
 * genauso einfach sein wie die Erteilung (Art. 7 Abs. 3 Satz 4 DSGVO) – ein
 * dauerhaft sichtbarer Einstieg erfüllt das.
 */
export function LegalFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const openSettings = useConsentStore((s) => s.openSettings)

  return (
    <footer
      className={`w-full border-t border-border/50 px-4 py-5 text-center text-xs text-muted ${className}`}
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link
          to="/impressum"
          className="focus-ring rounded transition-colors hover:text-foreground"
        >
          {t('legal.imprint')}
        </Link>
        <Link
          to="/datenschutz"
          className="focus-ring rounded transition-colors hover:text-foreground"
        >
          {t('legal.privacy')}
        </Link>
        <button
          type="button"
          onClick={openSettings}
          className="focus-ring rounded transition-colors hover:text-foreground"
        >
          {t('consent.settings')}
        </button>
      </nav>
    </footer>
  )
}
