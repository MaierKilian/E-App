import { useTranslation } from 'react-i18next'
import { Home, AppWindow, Flame, Building2, Layers, Ban } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
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
const ITEM_ICONS: Record<RenovationItem, LucideIcon> = {
  roof_insulation: Home,
  windows: AppWindow,
  heating_system: Flame,
  facade: Building2,
  basement_ceiling: Layers,
  nothing: Ban,
}

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
    <div className="space-y-6">
      <Field title={t('onboarding.step7renovation.lastRenovationYear')} info={t('info.renovation')}>
        <div className="flex flex-wrap gap-2">
          {RENOVATION_YEARS.map((year) => (
            <OptionChip
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
      </Field>

      {data.lastRenovationYear !== 'never' && (
        <Field
          title={t('onboarding.step7renovation.renovationItems')}
          hint={t('onboarding.step7renovation.itemsHint')}
        >
          <div className="flex flex-wrap gap-2">
            {RENOVATION_ITEMS.map((item) => (
              <OptionChip
                key={item}
                icon={ITEM_ICONS[item]}
                label={t(`onboarding.step7renovation.renovationItemOptions.${item}`)}
                selected={data.renovationItems.includes(item)}
                onClick={() => toggleRenovationItem(item)}
              />
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}
