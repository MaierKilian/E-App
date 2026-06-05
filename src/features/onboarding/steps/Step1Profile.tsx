import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import type { OnboardingData } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

export function Step1Profile({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step1.profileName')}
        </label>
        <input
          type="text"
          value={data.profileName}
          onChange={(e) => onChange({ profileName: e.target.value })}
          placeholder={t('onboarding.step1.profileNamePlaceholder')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-foreground">
          {t('onboarding.step1.persons')}
        </label>
        <Stepper
          value={data.personsCount}
          min={1}
          max={10}
          onChange={(v) => onChange({ personsCount: v })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-foreground">
          {t('onboarding.step1.rooms')}
        </label>
        <Stepper
          value={data.roomsCount}
          min={1}
          max={20}
          onChange={(v) => onChange({ roomsCount: v })}
        />
      </div>
    </div>
  )
}
