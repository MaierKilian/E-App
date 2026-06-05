import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import type { OnboardingData, LocationMode } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const LOCATION_MODES: LocationMode[] = ['manual', 'automatic', 'skip']

export function Step7Location({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('onboarding.step7.subtitle')}</p>
      <div className="flex flex-wrap gap-2">
        {LOCATION_MODES.map((mode) => (
          <SelectChip
            key={mode}
            label={t(`onboarding.step7.${mode}`)}
            selected={data.locationMode === mode}
            onClick={() => onChange({ locationMode: mode })}
          />
        ))}
      </div>
      <p className="text-sm text-muted">
        {t('onboarding.step7.selected')}:{' '}
        <span className="font-medium text-foreground">
          {data.locationMode ? t(`onboarding.step7.${data.locationMode}`) : t('onboarding.step7.none')}
        </span>
      </p>
    </div>
  )
}
