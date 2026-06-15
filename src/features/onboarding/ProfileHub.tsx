import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  User,
  Building2,
  DoorOpen,
  Flame,
  Layers,
  Gauge,
  Hammer,
  MapPin,
  Wallet,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OnboardingData } from '@/types'
import { profileCompleteness } from '@/features/home/estimateEnergy'
import { sectionStatus } from './sectionStatus'

/** Hub-Index des optionalen Preise-Schritts (Detailed-Index 8). */
export const PRICES_INDEX = 8

interface ProfileHubProps {
  data: OnboardingData
  onOpenSection: (index: number) => void
  onDone: () => void
}

interface SectionDef {
  index: number
  icon: LucideIcon
  titleKey: string
}

// Reihenfolge entspricht DetailedStepContent (0..7). Review (8) wird NICHT gelistet.
const SECTIONS: SectionDef[] = [
  { index: 0, icon: User, titleKey: 'onboarding.step1.title' },
  { index: 1, icon: Building2, titleKey: 'onboarding.step2.title' },
  { index: 2, icon: DoorOpen, titleKey: 'onboarding.step3.title' },
  { index: 3, icon: Flame, titleKey: 'onboarding.step4.title' },
  { index: 4, icon: Layers, titleKey: 'onboarding.step5.title' },
  { index: 5, icon: Gauge, titleKey: 'onboarding.step6.title' },
  { index: 6, icon: Hammer, titleKey: 'onboarding.step7renovation.title' },
  { index: 7, icon: MapPin, titleKey: 'onboarding.step7.title' },
]

interface HubTileProps {
  icon: LucideIcon
  title: string
  onClick: () => void
  /** Füllgrad 0..100 (für die Fortschrittsleiste der Kachel). */
  pct?: number
  complete?: boolean
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
  complete = false,
  open = 0,
  accent = false,
  badge,
  subtitle,
}: HubTileProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring glass relative flex flex-col gap-2 rounded-2xl p-3 text-left transition-transform active:scale-[0.98] ${
        complete ? 'ring-1 ring-primary/40' : ''
      }`}
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
          ) : (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              {t('onboarding.hub.sectionOpen', { count: open })}
            </span>
          ))}
      </div>

      <p className="text-sm font-medium leading-tight text-foreground">{title}</p>

      {subtitle ? (
        <p className="mt-auto text-[11px] leading-tight text-muted">{subtitle}</p>
      ) : (
        <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </button>
  )
}

export function ProfileHub({ data, onOpenSection, onDone }: ProfileHubProps) {
  const { t } = useTranslation()
  const statuses = sectionStatus(data)
  const completeness = profileCompleteness(data)

  return (
    <div className="space-y-4">
      {/* Kopfzeile: gut sichtbares Zurück (-> Dashboard) + Fertig */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDone}
          className="focus-ring -ml-1 flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="focus-ring rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          {t('onboarding.hub.done')}
        </button>
      </div>

      {/* Titel + Gesamtfortschritt */}
      <div>
        <h2 className="text-lg font-bold text-foreground">{t('onboarding.hub.title')}</h2>
        <div className="mt-2 flex items-center gap-3">
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
      </div>

      {/* Kachel-Grid der Abschnitte */}
      <div className="grid grid-cols-2 gap-2.5">
        {SECTIONS.map((section) => {
          const status = statuses[section.index]
          const pct =
            status.total > 0
              ? Math.round(((status.total - status.open) / status.total) * 100)
              : 0
          return (
            <HubTile
              key={section.index}
              icon={section.icon}
              title={t(section.titleKey)}
              pct={pct}
              complete={status.open === 0}
              open={status.open}
              onClick={() => onOpenSection(section.index)}
            />
          )
        })}

        {/* Optional: individuelle Verbrauchspreise. */}
        <HubTile
          icon={Wallet}
          title={t('onboarding.prices.title')}
          accent
          subtitle={t('onboarding.hub.optional')}
          onClick={() => onOpenSection(PRICES_INDEX)}
        />
      </div>
    </div>
  )
}
