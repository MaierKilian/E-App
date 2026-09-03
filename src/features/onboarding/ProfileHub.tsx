import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OnboardingData } from '@/types'
import { useOnboardingStore } from '@/store/onboardingStore'
import {
  ONBOARDING_SECTIONS,
  hubSections,
  profileCompleteness,
  stateOf,
  statusOf,
  type SectionState,
} from './sections'
import { FieldUsageSummary } from './FieldUsageSummary'

interface ProfileHubProps {
  data: OnboardingData
  onOpenSection: (index: number) => void
  onDone: () => void
}

interface HubTileProps {
  icon: LucideIcon
  title: string
  onClick: () => void
  /** Füllgrad 0..100 (für die Fortschrittsleiste der Kachel). */
  pct?: number
  /** Drei Zustände; `undefined` = freiwilliger Abschnitt ohne Statusanspruch. */
  state?: SectionState
  open?: number
  accent?: boolean
  badge?: ReactNode
  subtitle?: string
}

/**
 * Kompakte, antippbare Kategorie-Kachel mit Icon, Status (erledigt/offen) und
 * einer Füllanzeige am unteren Rand – so sieht man auf einen Blick, wie weit ein
 * Abschnitt ausgefüllt ist.
 */
function HubTile({
  icon: Icon,
  title,
  onClick,
  pct = 0,
  state,
  open = 0,
  accent = false,
  badge,
  subtitle,
}: HubTileProps) {
  const { t } = useTranslation()
  const complete = state === 'complete'
  const started = state === 'started'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring glass relative flex flex-col gap-2 rounded-2xl p-3 text-left transition-transform active:scale-[0.98] ${
        complete ? 'ring-1 ring-primary/40' : ''
      } ${started ? 'ring-1 ring-amber-500/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${
            complete || accent ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-foreground'
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        {badge ??
          (complete ? (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : state ? (
            // Angefangen wird deutlicher gezeigt als nie besucht: Der begonnene
            // Abschnitt ist eine offene Schleife, der andere nur noch nicht dran.
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                started
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'bg-surface-2 text-muted'
              }`}
            >
              {t(
                started ? 'onboarding.hub.sectionStarted' : 'onboarding.hub.sectionOpen',
                { count: open },
              )}
            </span>
          ) : null)}
      </div>

      <p className="text-sm font-medium leading-tight text-foreground">{title}</p>

      {subtitle ? (
        <p className="mt-auto text-[11px] leading-tight text-muted">{subtitle}</p>
      ) : (
        <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              started ? 'progress-striped' : 'bg-primary'
            }`}
            style={{ width: `${started ? Math.max(pct, 12) : pct}%` }}
          />
        </div>
      )}
    </button>
  )
}

/**
 * Profil-Hub: die dritte Tür zu jedem Feld (neben Fragebogen und Check).
 *
 * Zeigt **alle** Abschnitte der Registry – auch die, die der Schnellstart nie
 * gezeigt hat. Vorher pflegte diese Datei eine eigene Abschnittsliste; ein dort
 * vergessener Abschnitt wäre unbemerkt unerreichbar geblieben.
 */
export function ProfileHub({ data, onOpenSection, onDone }: ProfileHubProps) {
  const { t } = useTranslation()
  const visitedSections = useOnboardingStore((s) => s.visitedSections)
  const completeness = profileCompleteness(data)

  return (
    <div className="space-y-4">
      {/* Zurück (-> Dashboard) + Titel + „Fertig" – wie auf allen Seiten. */}
      <PageHeader
        title={t('onboarding.hub.title')}
        back={{ label: t('common.back'), onClick: onDone }}
        actions={
          <button
            type="button"
            onClick={onDone}
            className="focus-ring rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            {t('onboarding.hub.done')}
          </button>
        }
      />

      {/* Gesamtfortschritt */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted tabular-nums">
          {completeness}%
        </span>
      </div>

      {/* Kachel-Grid der Abschnitte – Reihenfolge und Umfang aus der Registry. */}
      <div className="grid grid-cols-2 gap-2.5">
        {hubSections().map((section) => {
          const status = statusOf(section, data)
          // Abschnitte ohne Pflichtangabe (Preise, Standort) sind freiwillig –
          // ein Haken dort behauptete eine Leistung, die niemand erbracht hat.
          const isOptional = status.total === 0
          return (
            <HubTile
              key={section.id}
              icon={section.icon}
              title={t(section.titleKey)}
              pct={status.pct}
              state={isOptional ? undefined : stateOf(section, data, visitedSections)}
              open={status.open}
              accent={isOptional}
              subtitle={isOptional ? t('onboarding.hub.optional') : undefined}
              onClick={() => onOpenSection(ONBOARDING_SECTIONS.indexOf(section))}
            />
          )
        })}
      </div>

      {/* Unter den Kacheln, nicht darüber: Wer hierher kommt, will zuerst
          sehen, was offen ist. Wofür die Angaben gebraucht werden, ist die
          Antwort auf die Frage danach – und hier, nach ein paar Wochen
          Nutzung, erklärt sie tatsächlich etwas. */}
      <FieldUsageSummary />
    </div>
  )
}
