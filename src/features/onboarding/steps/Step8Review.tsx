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
      if (i.modelTypes?.length) {
        const subs = i.modelTypes
          .map((m) => t(`onboarding.step6.modelTypes.${i.type}.${m}`))
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

  const goalsSummary = data.goals
    .map((g) => t(`onboarding.step1.goalOptions.${g}`))
    .join(', ')

  const smartHomeDevicesSummary = data.smartHomeDevices
    .map((d) => t(`onboarding.step6.smartHomeOptions.${d}`))
    .join(', ')

  const renovationItemsSummary = data.renovationItems
    .map((i) => t(`onboarding.step7renovation.renovationItemOptions.${i}`))
    .join(', ')

  const isDetailed = data.mode === 'detailed'

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('onboarding.step8.subtitle')}</p>

      <ReviewSection title={t('onboarding.step8.sections.profile')}>
        <ReviewRow label={t('onboarding.step8.labels.profileName')} value={data.profileName || '—'} />
        <ReviewRow label={t('onboarding.step8.labels.persons')} value={data.personsCount} />
        {!isDetailed && (
          <ReviewRow label={t('onboarding.step8.labels.roomsCount')} value={data.roomsCount} />
        )}
        {isDetailed && goalsSummary && (
          <ReviewRow label={t('onboarding.step8.labels.goals')} value={goalsSummary} />
        )}
        {isDetailed && data.occupancyStatus && (
          <ReviewRow
            label={t('onboarding.step8.labels.occupancyStatus')}
            value={t(`onboarding.step1.occupancyOptions.${data.occupancyStatus}`)}
          />
        )}
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
        {isDetailed && (
          <>
            <ReviewRow label={t('onboarding.step8.labels.floors')} value={data.floors} />
            <ReviewRow
              label={t('onboarding.step8.labels.windowAge')}
              value={t(`onboarding.step2.windowAgeOptions.${data.windowAge}`)}
            />
          </>
        )}
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
        {isDetailed && (
          <>
            <ReviewRow
              label={t('onboarding.step8.labels.hasPV')}
              value={t(`onboarding.step4.pvOptions.${data.hasPV}`)}
            />
            <ReviewRow
              label={t('onboarding.step8.labels.hasExtraFireplace')}
              value={data.hasExtraFireplace ? t('onboarding.step4.yes') : t('onboarding.step4.no')}
            />
          </>
        )}
      </ReviewSection>

      {data.rooms.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.heatTransfer')}>
          <p className="text-sm text-foreground">{heatTransferSummary || '—'}</p>
          {isDetailed && (
            <>
              <ReviewRow
                label={t('onboarding.step8.labels.ventilationType')}
                value={t(`onboarding.step5.ventilationOptions.${data.ventilationType}`)}
              />
              <ReviewRow
                label={t('onboarding.step8.labels.insulationState')}
                value={t(`onboarding.step5.insulationOptions.${data.insulationState}`)}
              />
            </>
          )}
        </ReviewSection>
      )}

      {data.instruments.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.instruments')}>
          <p className="text-sm text-foreground">{instrumentsSummary || '—'}</p>
          {isDetailed && (
            <>
              {smartHomeDevicesSummary && (
                <ReviewRow
                  label={t('onboarding.step8.labels.smartHomeDevices')}
                  value={smartHomeDevicesSummary}
                />
              )}
              <ReviewRow
                label={t('onboarding.step8.labels.energyCostRange')}
                value={t(`onboarding.step6.energyCostOptions.${data.energyCostRange}`)}
              />
            </>
          )}
        </ReviewSection>
      )}

      {isDetailed && (
        <ReviewSection title={t('onboarding.step8.sections.renovation')}>
          <ReviewRow
            label={t('onboarding.step8.labels.lastRenovationYear')}
            value={t(`onboarding.step7renovation.renovationYearOptions.${data.lastRenovationYear}`)}
          />
          {renovationItemsSummary && (
            <ReviewRow
              label={t('onboarding.step8.labels.renovationItems')}
              value={renovationItemsSummary}
            />
          )}
        </ReviewSection>
      )}

      <ReviewSection title={t('onboarding.step8.sections.location')}>
        <ReviewRow
          label={t('onboarding.step8.labels.postalCode')}
          value={data.postalCode || '—'}
        />
      </ReviewSection>
    </div>
  )
}
