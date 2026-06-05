import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Zap,
  Cloud,
  Gauge,
  Home,
  Ruler,
  LineChart,
  FileText,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { InfoButton } from '@/components/ui/InfoButton'
import { Step8Review } from '@/features/onboarding/steps/Step8Review'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import type { OnboardingData } from '@/types'
import { ProgressRing } from './ProgressRing'
import { StatTile } from './StatTile'
import { NextSteps, type NextStepTask } from './NextSteps'
import { TipOfTheDay } from './TipOfTheDay'
import {
  estimateAnnualConsumptionKwh,
  estimateAnnualCostEur,
  estimateAnnualCo2Kg,
  profileCompleteness,
} from './estimateEnergy'

interface HomeDashboardProps {
  data: OnboardingData
  onEdit: () => void
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass flex flex-col items-center gap-2 rounded-3xl p-4 text-center transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
    >
      <span className="grid place-items-center w-10 h-10 rounded-2xl bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
    </button>
  )
}

export function HomeDashboard({ data, onEdit }: HomeDashboardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tariff = useTariffStore()
  const reset = useOnboardingStore((s) => s.reset)
  const [profileOpen, setProfileOpen] = useState(false)

  const completeness = profileCompleteness(data)
  const kwh = estimateAnnualConsumptionKwh(data.personsCount, data.livingArea)
  const cost = estimateAnnualCostEur(
    kwh,
    tariff.electricityWorkPrice,
    tariff.electricityBasePrice,
  )
  const co2 = estimateAnnualCo2Kg(kwh)

  const numberFmt = new Intl.NumberFormat('de-DE')
  const formatCost = Math.round(cost)

  const tasks: NextStepTask[] = [
    {
      id: 'tariff',
      label: t('home.nextSteps.tariff'),
      done: tariff.isCustom,
      onClick: () => navigate('/monitoring'),
    },
    {
      id: 'measurement',
      label: t('home.nextSteps.measurement'),
      done: false,
      onClick: () => navigate('/measurements'),
    },
    {
      id: 'meter',
      label: t('home.nextSteps.meter'),
      done: false,
      onClick: () => navigate('/monitoring'),
    },
    {
      id: 'profile',
      label: t('home.nextSteps.profile'),
      done: completeness >= 90,
      onClick: onEdit,
    },
  ]

  return (
    <div className="space-y-5 pb-4">
      {/* 1. Begrüßung + Fortschrittsring */}
      <Card className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{t('home.greeting')}</p>
          <h1 className="text-xl font-bold text-foreground truncate">
            {data.profileName.trim() || t('home.profileNameFallback')}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {t('home.completenessLabel', { value: completeness })}
          </p>
        </div>
        <ProgressRing value={completeness} label={t('home.completenessLabel', { value: completeness })} />
      </Card>

      {/* 2. Hero-Karte: geschätzte Energiekosten / Jahr */}
      <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted">{t('home.hero.label')}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-foreground tabular-nums">
                {numberFmt.format(formatCost)}
              </span>
              <span className="text-lg font-semibold text-primary">
                {t('home.hero.perYear')}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('home.hero.kwhNote', { kwh: numberFmt.format(kwh) })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-2 text-muted">
              {t('home.hero.estimateNote')}
            </span>
            <InfoButton title={t('home.hero.title')} text={t('home.hero.info')} />
          </div>
        </div>
      </Card>

      {/* 3. Schnell-Kacheln (2×2) */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={Zap}
          label={t('home.stats.electricityPrice')}
          value={numberFmt.format(tariff.electricityWorkPrice)}
          unit={t('home.stats.unitCtKwh')}
          badge={tariff.isCustom ? t('home.stats.badgeCustom') : t('home.stats.badgeAvg')}
        />
        <StatTile
          icon={Cloud}
          label={t('home.stats.co2')}
          value={numberFmt.format(co2)}
          unit={t('home.stats.unitKgYear')}
        />
        <StatTile
          icon={Gauge}
          label={t('home.stats.consumption')}
          value={numberFmt.format(kwh)}
          unit={t('home.stats.unitKwhYear')}
        />
        <StatTile
          icon={Home}
          label={t('home.stats.livingArea')}
          value={numberFmt.format(data.livingArea)}
          unit={t('home.stats.unitSqm')}
        />
      </div>

      {/* 4. Nächste Schritte */}
      <NextSteps tasks={tasks} />

      {/* 5. Schnellzugriffe */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 px-1">
          {t('home.quickActions.title')}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionButton
            icon={Ruler}
            label={t('home.quickActions.startMeasurement')}
            onClick={() => navigate('/measurements')}
          />
          <QuickActionButton
            icon={LineChart}
            label={t('home.quickActions.meterReading')}
            onClick={() => navigate('/monitoring')}
          />
          <QuickActionButton
            icon={FileText}
            label={t('home.quickActions.report')}
            onClick={() => navigate('/reports')}
          />
        </div>
      </div>

      {/* 6. Tipp des Tages */}
      <TipOfTheDay />

      {/* 7. Haushaltsprofil (einklappbar, standardmäßig zu) */}
      <Card className="space-y-3">
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-sm font-semibold text-foreground">
            {t('home.profile.sectionTitle')}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            {profileOpen ? t('home.profile.collapse') : t('home.profile.expand')}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {profileOpen && (
          <div className="animate-step-in space-y-4">
            <Step8Review data={data} />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="w-full py-3 rounded-2xl border border-primary text-primary font-medium text-sm hover:bg-primary/10 transition-colors"
              >
                {t('home.profile.editButton')}
              </button>
              <button
                type="button"
                onClick={reset}
                className="w-full py-2.5 rounded-2xl text-muted font-medium text-xs hover:text-foreground transition-colors"
              >
                {t('home.profile.resetButton')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
