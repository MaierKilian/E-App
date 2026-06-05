import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  User,
  Building2,
  DoorOpen,
  Flame,
  Layers,
  Gauge,
  Hammer,
  MapPin,
  Cpu,
  Sparkles,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OnboardingData } from '@/types'
import { ProgressRing } from '@/features/home/ProgressRing'
import { profileCompleteness } from '@/features/home/estimateEnergy'
import { sectionStatus } from './sectionStatus'

/** Hub-Index für den Gebäudeautomations-Abschnitt (hinter den Detailed-Schritten). */
export const GA_INDEX = 9

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

const PRIMARY_BTN =
  'flex items-center justify-center gap-1 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]'

/** Eine antippbare Abschnitts-Karte mit Icon, Titel, Status und Chevron. */
function SectionRow({
  icon: Icon,
  title,
  status,
  badge,
  onClick,
}: {
  icon: LucideIcon
  title: string
  status: React.ReactNode
  badge?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring glass w-full rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
    >
      <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-surface-2/70 text-foreground">
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {title}
          {badge}
        </span>
        <span className="block mt-0.5 text-xs">{status}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-muted" />
    </button>
  )
}

export function ProfileHub({ data, onOpenSection, onDone }: ProfileHubProps) {
  const { t } = useTranslation()
  const completeness = profileCompleteness(data)
  const statuses = sectionStatus(data)

  return (
    <div className="pb-28 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('onboarding.hub.title')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('onboarding.hub.subtitle')}</p>
      </div>

      <div className="glass rounded-3xl p-5 flex items-center gap-4">
        <ProgressRing value={completeness} size={64} stroke={6} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {(data.profileName ?? '').trim() || t('home.profileNameFallback')}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {t('home.completenessLabel', { value: completeness })}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {SECTIONS.map((section) => {
          const status = statuses[section.index]
          const complete = status.open === 0
          return (
            <SectionRow
              key={section.index}
              icon={section.icon}
              title={t(section.titleKey)}
              onClick={() => onOpenSection(section.index)}
              status={
                complete ? (
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    <Check className="w-3.5 h-3.5" />
                    {t('onboarding.hub.sectionComplete')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                    <span className="text-base leading-none">●</span>
                    {t('onboarding.hub.sectionOpen', { count: status.open })}
                  </span>
                )
              }
            />
          )
        })}

        {/* Zusatz-Abschnitt: Gebäudeautomation (optional, mit „Neu"-Badge). */}
        <SectionRow
          icon={Cpu}
          title={t('onboarding.hub.gaTitle')}
          onClick={() => onOpenSection(GA_INDEX)}
          badge={
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Sparkles className="w-3 h-3" />
              {t('onboarding.hub.gaNew')}
            </span>
          }
          status={<span className="text-muted">{t('onboarding.ga.subtitle')}</span>}
        />
      </div>

      <button type="button" onClick={onDone} className={`${PRIMARY_BTN} w-full`}>
        {t('onboarding.hub.done')}
      </button>
    </div>
  )
}
