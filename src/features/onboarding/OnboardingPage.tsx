import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { StepIndicator } from './StepIndicator'
import { Step0Mode } from './steps/Step0Mode'
import { Step1Profile } from './steps/Step1Profile'
import { Step2Building } from './steps/Step2Building'
import { Step3Rooms } from './steps/Step3Rooms'
import { Step4Heating } from './steps/Step4Heating'
import { Step5HeatTransfer } from './steps/Step5HeatTransfer'
import { Step6Instruments } from './steps/Step6Instruments'
import { Step7Location } from './steps/Step7Location'
import { Step7Renovation } from './steps/Step7Renovation'
import { Step8Review } from './steps/Step8Review'
import { Card } from '@/components/ui/Card'
import { HomeDashboard } from '@/features/home/HomeDashboard'
import type { OnboardingData } from '@/types'

// Quick flow steps (indices 0..4, displayed as steps 1..5):
// 0 = Profile, 1 = Building, 2 = Heating, 3 = Instruments, 4 = Review
const QUICK_TOTAL = 5

// Detailed flow steps (indices 0..8, displayed as steps 1..9):
// 0 = Profile, 1 = Building, 2 = Rooms, 3 = Heating, 4 = HeatTransfer,
// 5 = Instruments, 6 = Renovation, 7 = Location, 8 = Review
const DETAILED_TOTAL = 9

function getStepTitle(step: number, mode: 'quick' | 'detailed', t: (key: string) => string): string {
  if (mode === 'quick') {
    const keys = [
      'onboarding.step1.title',
      'onboarding.step2.title',
      'onboarding.step4.title',
      'onboarding.step6.title',
      'onboarding.step8.title',
    ]
    return t(keys[step] ?? keys[0])
  }
  const keys = [
    'onboarding.step1.title',
    'onboarding.step2.title',
    'onboarding.step3.title',
    'onboarding.step4.title',
    'onboarding.step5.title',
    'onboarding.step6.title',
    'onboarding.step7renovation.title',
    'onboarding.step7.title',
    'onboarding.step8.title',
  ]
  return t(keys[step] ?? keys[0])
}

interface StepContentProps {
  step: number
  mode: 'quick' | 'detailed'
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

function QuickStepContent({ step, data, onChange }: Omit<StepContentProps, 'mode'>) {
  switch (step) {
    case 0: return <Step1Profile data={data} onChange={onChange} />
    case 1: return <Step2Building data={data} onChange={onChange} />
    case 2: return <Step4Heating data={data} onChange={onChange} />
    case 3: return <Step6Instruments data={data} onChange={onChange} />
    case 4: return <Step8Review data={data} />
    default: return null
  }
}

function DetailedStepContent({ step, data, onChange }: Omit<StepContentProps, 'mode'>) {
  switch (step) {
    case 0: return <Step1Profile data={data} onChange={onChange} detailed />
    case 1: return <Step2Building data={data} onChange={onChange} detailed />
    case 2: return <Step3Rooms data={data} onChange={onChange} />
    case 3: return <Step4Heating data={data} onChange={onChange} detailed />
    case 4: return <Step5HeatTransfer data={data} onChange={onChange} />
    case 5: return <Step6Instruments data={data} onChange={onChange} detailed />
    case 6: return <Step7Renovation data={data} onChange={onChange} />
    case 7: return <Step7Location data={data} onChange={onChange} />
    case 8: return <Step8Review data={data} />
    default: return null
  }
}

function StepBody({ mode, step, data, onChange }: StepContentProps) {
  return mode === 'quick' ? (
    <QuickStepContent step={step} data={data} onChange={onChange} />
  ) : (
    <DetailedStepContent step={step} data={data} onChange={onChange} />
  )
}

/**
 * Fest fixierte Aktionsleiste am unteren Bildschirmrand (Glass-Stil).
 * Liegt oberhalb der mobilen BottomNav und enthält Zurück / Weiter bzw. Speichern.
 */
function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-bar fixed inset-x-0 z-30 border-t border-border/60 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">{children}</div>
    </div>
  )
}

const PRIMARY_BTN =
  'flex items-center justify-center gap-1 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]'
const SECONDARY_BTN =
  'flex items-center justify-center gap-1 px-5 py-3 rounded-2xl border border-border bg-surface/70 text-foreground text-sm font-medium transition-[transform,colors] hover:bg-surface-2 active:scale-[0.97]'

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, currentStep, setStep, updateData, complete, editProfile } = useOnboardingStore()

  // Step -1 = mode selection (Step0Mode), steps >= 0 = actual flow steps
  const isOnModeSelection = currentStep === -1
  const mode = data.mode

  const totalSteps = mode === 'quick' ? QUICK_TOTAL : DETAILED_TOTAL
  const isLastStep = !isOnModeSelection && currentStep === totalSteps - 1
  // Der Review-Schritt bringt eigene Karten mit – kein zusätzlicher Card-Rahmen.
  const isReviewStep = isLastStep

  if (data.completed) {
    return <HomeDashboard data={data} onEdit={editProfile} />
  }

  function handleBack() {
    if (isOnModeSelection) return
    if (currentStep === 0) {
      setStep(-1)
    } else {
      setStep(currentStep - 1)
    }
  }

  function handleNext() {
    if (isOnModeSelection) {
      setStep(0)
      return
    }
    if (currentStep < totalSteps - 1) {
      setStep(currentStep + 1)
    }
  }

  function handleSave() {
    complete()
    navigate('/measurements')
  }

  // Mode-Auswahl: eigener Screen mit eigener Aktionsleiste.
  if (isOnModeSelection) {
    return (
      <div className="pb-24">
        <div key="mode" className="animate-step-in">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {t('onboarding.step0.title')}
          </h2>
          <p className="text-sm text-muted mb-5">{t('onboarding.step0.subtitle')}</p>
          <Step0Mode data={data} onChange={updateData} />
        </div>

        <ActionBar>
          <button type="button" onClick={handleNext} className={`${PRIMARY_BTN} w-full`}>
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </ActionBar>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={getStepTitle(currentStep, mode, t)}
      />

      <div key={`${mode}-${currentStep}`} className="animate-step-in mt-5">
        {isReviewStep ? (
          <StepBody mode={mode} step={currentStep} data={data} onChange={updateData} />
        ) : (
          <Card>
            <StepBody mode={mode} step={currentStep} data={data} onChange={updateData} />
          </Card>
        )}
      </div>

      <ActionBar>
        <button type="button" onClick={handleBack} className={SECONDARY_BTN}>
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        {isLastStep ? (
          <button type="button" onClick={handleSave} className={`${PRIMARY_BTN} flex-1`}>
            {t('common.save')}
          </button>
        ) : (
          <button type="button" onClick={handleNext} className={`${PRIMARY_BTN} flex-1`}>
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </ActionBar>
    </div>
  )
}
