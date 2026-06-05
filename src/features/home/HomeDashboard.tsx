import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Step8Review } from '@/features/onboarding/steps/Step8Review'
import { useOnboardingStore } from '@/store/onboardingStore'
import type { OnboardingData } from '@/types'
import { ProgressRing } from './ProgressRing'
import { profileCompleteness } from './estimateEnergy'

interface HomeDashboardProps {
  data: OnboardingData
  onEdit: () => void
}

/**
 * Ultra-minimalistisches Zuhause-Dashboard:
 * Fortschrittsring + Begrüßung (ganze Karte öffnet den Fragebogen), ein großer
 * Fragebogen-Button und das einklappbare Haushaltsprofil. Bewusst ohne weitere
 * Kacheln, damit es ohne Scrollen auf einen Screen passt.
 */
export function HomeDashboard({ data, onEdit }: HomeDashboardProps) {
  const { t } = useTranslation()
  const reset = useOnboardingStore((s) => s.reset)
  const [profileOpen, setProfileOpen] = useState(false)

  const completeness = profileCompleteness(data)
  const isComplete = completeness >= 100

  return (
    <div className="space-y-4">
      {/* 1. Begrüßung + Fortschrittsring – ganze Karte öffnet den Fragebogen */}
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring glass w-full text-left rounded-3xl p-5 flex items-center gap-4 transition-transform duration-200 active:scale-[0.99]"
      >
        <ProgressRing value={completeness} size={72} stroke={6} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{t('home.greeting')}</p>
          <h1 className="text-xl font-bold text-foreground truncate">
            {(data.profileName ?? '').trim() || t('home.profileNameFallback')}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {t('home.completenessLabel', { value: completeness })}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted shrink-0" />
      </button>

      {/* 2. Großer, klarer Fragebogen-Button */}
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring w-full flex items-center justify-center gap-2 rounded-3xl bg-primary text-primary-foreground py-4 font-semibold shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_30%,transparent)] active:scale-[0.98] transition-transform"
      >
        <ClipboardList className="w-5 h-5" />
        {isComplete ? t('home.questionnaire.review') : t('home.questionnaire.continue')}
      </button>

      {/* 3. Haushaltsprofil (einklappbar, standardmäßig zu) */}
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
