import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { StepIndicator } from './StepIndicator'
import { Step1Profile } from './steps/Step1Profile'
import { Step2Building } from './steps/Step2Building'
import { Step3Rooms } from './steps/Step3Rooms'
import { Step4Heating } from './steps/Step4Heating'
import { Step5HeatTransfer } from './steps/Step5HeatTransfer'
import { Step6Instruments } from './steps/Step6Instruments'
import { Step7Location } from './steps/Step7Location'
import { Step8Review } from './steps/Step8Review'
import { Card } from '@/components/ui/Card'
import type { OnboardingData } from '@/types'

const TOTAL_STEPS = 8

function getStepTitle(step: number, t: (key: string) => string) {
  const keys = [
    'onboarding.step1.title',
    'onboarding.step2.title',
    'onboarding.step3.title',
    'onboarding.step4.title',
    'onboarding.step5.title',
    'onboarding.step6.title',
    'onboarding.step7.title',
    'onboarding.step8.title',
  ]
  return t(keys[step] ?? keys[0])
}

function StepContent({
  step,
  data,
  onChange,
}: {
  step: number
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}) {
  switch (step) {
    case 0: return <Step1Profile data={data} onChange={onChange} />
    case 1: return <Step2Building data={data} onChange={onChange} />
    case 2: return <Step3Rooms data={data} onChange={onChange} />
    case 3: return <Step4Heating data={data} onChange={onChange} />
    case 4: return <Step5HeatTransfer data={data} onChange={onChange} />
    case 5: return <Step6Instruments data={data} onChange={onChange} />
    case 6: return <Step7Location data={data} onChange={onChange} />
    case 7: return <Step8Review data={data} />
    default: return null
  }
}

function CompletedSummary({
  data,
  onEdit,
}: {
  data: OnboardingData
  onEdit: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-foreground">
          {t('onboarding.completed.title')}
        </h2>
        <p className="text-sm text-muted mt-1">{t('onboarding.completed.subtitle')}</p>
        {data.profileName && (
          <p className="mt-3 text-base font-medium text-primary">{data.profileName}</p>
        )}
      </Card>
      <Step8Review data={data} />
      <button
        type="button"
        onClick={onEdit}
        className="w-full py-3 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/10 transition-colors"
      >
        {t('onboarding.completed.editButton')}
      </button>
    </div>
  )
}

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, currentStep, setStep, updateData, complete, reset } = useOnboardingStore()

  if (data.completed) {
    return (
      <CompletedSummary
        data={data}
        onEdit={() => {
          reset()
        }}
      />
    )
  }

  function handleBack() {
    if (currentStep > 0) {
      setStep(currentStep - 1)
    }
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setStep(currentStep + 1)
    }
  }

  function handleSave() {
    complete()
    navigate('/measurements')
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1

  return (
    <div className="space-y-5">
      <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <Card>
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t('common.step')} {currentStep + 1} – {getStepTitle(currentStep, t)}
        </h2>
        <StepContent step={currentStep} data={data} onChange={updateData} />
      </Card>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-1 px-5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-sm font-medium disabled:opacity-40 hover:bg-surface-2 transition-colors active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 transition-transform"
          >
            {t('common.save')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 transition-transform"
          >
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
