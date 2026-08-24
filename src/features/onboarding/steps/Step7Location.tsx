import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Key, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { InfoButton } from '@/components/ui/InfoButton'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import type { OnboardingData, OccupancyStatus } from '@/types'

const OCCUPANCY_STATUSES: OccupancyStatus[] = ['tenant', 'owner']
const OCCUPANCY_ICONS: Record<OccupancyStatus, LucideIcon> = {
  tenant: Key,
  owner: Home,
}

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

export function Step7Location({ data, onChange }: Props) {
  const { t } = useTranslation()
  const [code, setCode] = useState(data.postalCode)

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 5)
    setCode(digits)
    onChange({ postalCode: digits, locationMode: digits ? 'manual' : 'skip' })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('onboarding.step7.subtitle')}</p>

      <div className="space-y-2">
        <label
          htmlFor="postal-code"
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          {t('onboarding.step7.postalCode')}
          <InfoButton text={t('info.location')} />
        </label>
        <input
          id="postal-code"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('onboarding.step7.postalCodePlaceholder')}
          className="focus-ring w-full px-4 py-3 rounded-2xl glass text-foreground placeholder:text-muted tabular-nums"
        />
        <p className="text-xs text-muted">{t('onboarding.step7.optionalHint')}</p>
      </div>

      {/* Mieter oder Eigentuemer stand vorher neben dem Profilnamen. Die Angabe
          entscheidet, welche Massnahmen ueberhaupt in Frage kommen – Dach- und
          Kellerdaemmung sind fuer Mieter nicht umsetzbar –, gehoert also zu den
          Rahmenbedingungen der Wohnung, nicht zur Begruessung. */}
      <Field
        title={t('onboarding.step1.occupancyStatus')}
        info={t('info.occupancy')}
        hint={t('onboarding.step1.statusHint')}
      >
        <div className="flex gap-2">
          {OCCUPANCY_STATUSES.map((status) => (
            <OptionChip
              key={status}
              icon={OCCUPANCY_ICONS[status]}
              label={t(`onboarding.step1.occupancyOptions.${status}`)}
              selected={data.occupancyStatus === status}
              onClick={() => onChange({ occupancyStatus: status })}
            />
          ))}
        </div>
      </Field>
    </div>
  )
}
