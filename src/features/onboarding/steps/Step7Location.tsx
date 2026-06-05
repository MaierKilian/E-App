import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData } from '@/types'

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
    </div>
  )
}
