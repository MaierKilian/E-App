import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { OnboardingData } from '@/types'

interface Props {
  data: OnboardingData
}

interface ReviewRowProps {
  label: string
  value: string | number
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

interface ReviewSectionProps {
  title: string
  children: React.ReactNode
}

function ReviewSection({ title, children }: ReviewSectionProps) {
  return (
    <Card className="space-y-1">
      <h3 className="text-sm font-semibold text-primary mb-2">{title}</h3>
      {children}
    </Card>
  )
}

export function Step8Review({ data }: Props) {
  const { t } = useTranslation()

  const roomsSummary = data.rooms
    .map((r) => `${t(`onboarding.step3.roomTypes.${r.type}`)} ×${r.count}`)
    .join(', ')

  const generatorsSummary = data.heatGenerators
    .map((g) => t(`onboarding.step4.generators.${g}`))
    .join(', ')

  const instrumentsSummary = data.instruments
    .map((i) => {
      const label = t(`onboarding.step6.instruments.${i.type}`)
      if (i.type === 'temperature_sensor' && i.temperatureSubTypes?.length) {
        const subs = i.temperatureSubTypes
          .map((s) => t(`onboarding.step6.temperatureSubTypes.${s}`))
          .join(', ')
        return `${label} (${subs})`
      }
      return label
    })
    .join(', ')

  const heatTransferSummary = data.rooms
    .map(
      (r) =>
        `${t(`onboarding.step3.roomTypes.${r.type}`)}: ${t(`onboarding.step5.${r.heatTransfer}`)}`,
    )
    .join(', ')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('onboarding.step8.subtitle')}</p>

      <ReviewSection title={t('onboarding.step8.sections.profile')}>
        <ReviewRow label={t('onboarding.step8.labels.profileName')} value={data.profileName || '—'} />
        <ReviewRow label={t('onboarding.step8.labels.persons')} value={data.personsCount} />
        <ReviewRow label={t('onboarding.step8.labels.roomsCount')} value={data.roomsCount} />
      </ReviewSection>

      <ReviewSection title={t('onboarding.step8.sections.building')}>
        <ReviewRow label={t('onboarding.step8.labels.buildingYear')} value={data.buildingYear} />
        <ReviewRow
          label={t('onboarding.step8.labels.buildingType')}
          value={t(`onboarding.step2.${data.buildingType}`)}
        />
        <ReviewRow
          label={t('onboarding.step8.labels.livingArea')}
          value={`${data.livingArea} m²`}
        />
      </ReviewSection>

      {data.rooms.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.rooms')}>
          <p className="text-sm text-foreground">{roomsSummary || '—'}</p>
        </ReviewSection>
      )}

      <ReviewSection title={t('onboarding.step8.sections.heating')}>
        <ReviewRow
          label={t('onboarding.step8.labels.heatGenerators')}
          value={generatorsSummary || '—'}
        />
        <ReviewRow
          label={t('onboarding.step8.labels.hotWater')}
          value={t(`onboarding.step4.hotWaterOptions.${data.hotWaterType}`)}
        />
      </ReviewSection>

      {data.rooms.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.heatTransfer')}>
          <p className="text-sm text-foreground">{heatTransferSummary || '—'}</p>
        </ReviewSection>
      )}

      {data.instruments.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.instruments')}>
          <p className="text-sm text-foreground">{instrumentsSummary || '—'}</p>
        </ReviewSection>
      )}

      <ReviewSection title={t('onboarding.step8.sections.location')}>
        <ReviewRow
          label={t('onboarding.step8.labels.locationMode')}
          value={t(`onboarding.step7.${data.locationMode}`)}
        />
      </ReviewSection>
    </div>
  )
}
