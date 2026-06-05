import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, RenovationYear, RenovationItem } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const RENOVATION_YEARS: RenovationYear[] = [
  'never',
  'before_2000',
  '2000_2010',
  '2010_2020',
  'after_2020',
  'unknown',
]

const RENOVATION_ITEMS: RenovationItem[] = [
  'roof_insulation',
  'windows',
  'heating_system',
  'facade',
  'basement_ceiling',
  'nothing',
]

export function Step7Renovation({ data, onChange }: Props) {
  const { t } = useTranslation()

  function toggleRenovationItem(item: RenovationItem) {
    const current = data.renovationItems
    if (item === 'nothing') {
      onChange({ renovationItems: current.includes('nothing') ? [] : ['nothing'] })
      return
    }
    const withoutNothing = current.filter((i) => i !== 'nothing')
    if (withoutNothing.includes(item)) {
      onChange({ renovationItems: withoutNothing.filter((i) => i !== item) })
    } else {
      onChange({ renovationItems: [...withoutNothing, item] })
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step7renovation.lastRenovationYear')}
          <InfoButton text={t('info.renovation')} />
        </label>
        <div className="flex flex-wrap gap-2">
          {RENOVATION_YEARS.map((year) => (
            <SelectChip
              key={year}
              label={t(`onboarding.step7renovation.renovationYearOptions.${year}`)}
              selected={data.lastRenovationYear === year}
              onClick={() =>
                onChange(
                  year === 'never'
                    ? { lastRenovationYear: year, renovationItems: [] }
                    : { lastRenovationYear: year },
                )
              }
            />
          ))}
        </div>
      </div>

      {data.lastRenovationYear !== 'never' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            {t('onboarding.step7renovation.renovationItems')}
          </label>
          <div className="flex flex-wrap gap-2">
            {RENOVATION_ITEMS.map((item) => (
              <SelectChip
                key={item}
                label={t(`onboarding.step7renovation.renovationItemOptions.${item}`)}
                selected={data.renovationItems.includes(item)}
                onClick={() => toggleRenovationItem(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
