import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { useConsentStore, isDecisionCurrent } from './consent'

/**
 * Feingranulare Einwilligungs-Einstellungen – erreichbar aus dem Hinweis, der
 * Fußzeile, den Einstellungen und der Datenschutzerklärung.
 *
 * Zeigt beide Kategorien: die notwendige (fest an, nicht abwählbar, mit
 * Begründung) und die einwilligungsbedürftige. Nur so ist erkennbar, worüber
 * überhaupt entschieden wird.
 */
export function ConsentSettings() {
  const { t } = useTranslation()
  const open = useConsentStore((s) => s.settingsOpen)
  const decision = useConsentStore((s) => s.decision)
  const closeSettings = useConsentStore((s) => s.closeSettings)

  const granted = isDecisionCurrent(decision) && decision.analytics

  return (
    <Modal open={open} onClose={closeSettings} title={t('consent.settingsTitle')}>
      {/* Der Inhalt liegt in einer eigenen Komponente, weil `Modal` seine
          Kinder im geschlossenen Zustand gar nicht rendert: Der Entwurf der
          Auswahl startet damit bei jedem Öffnen frisch beim gespeicherten
          Stand – ohne Effekt, der State nachträglich zurücksetzt. */}
      <ConsentSettingsForm granted={granted} />
    </Modal>
  )
}

/** Der Inhalt des Fensters: Kategorien, Entwurf der Auswahl, Schaltflächen. */
function ConsentSettingsForm({ granted }: { granted: boolean }) {
  const { t } = useTranslation()
  const closeSettings = useConsentStore((s) => s.closeSettings)
  const saveChoice = useConsentStore((s) => s.saveChoice)
  const rejectAll = useConsentStore((s) => s.rejectAll)

  // Entwurf der Auswahl – erst „Speichern" macht daraus eine Einwilligung.
  const [analytics, setAnalytics] = useState(granted)

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">{t('consent.settingsIntro')}</p>

      <CategoryRow
        title={t('consent.categories.necessary.title')}
        description={t('consent.categories.necessary.desc')}
        control={
          <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
            {t('consent.alwaysActive')}
          </span>
        }
      />

      <CategoryRow
        title={t('consent.categories.analytics.title')}
        description={t('consent.categories.analytics.desc')}
        control={
          <Toggle
            checked={analytics}
            onChange={setAnalytics}
            label={t('consent.categories.analytics.title')}
          />
        }
      />

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={rejectAll}
          className="focus-ring rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
        >
          {t('consent.reject')}
        </button>
        <button
          type="button"
          onClick={() => saveChoice({ analytics })}
          className="focus-ring rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
        >
          {t('consent.save')}
        </button>
      </div>

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <Link
          to="/datenschutz"
          onClick={closeSettings}
          className="focus-ring rounded underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t('legal.privacy')}
        </Link>
        <Link
          to="/impressum"
          onClick={closeSettings}
          className="focus-ring rounded underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t('legal.imprint')}
        </Link>
      </p>
    </div>
  )
}

/** Eine Kategorie: Titel, Erklärung und rechts das Steuerelement. */
function CategoryRow({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-surface-2/40 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  )
}
