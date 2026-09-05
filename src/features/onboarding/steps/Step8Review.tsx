import { useTranslation } from 'react-i18next'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { profileCompleteness, nextSection } from '../sections'
import { FieldUsageSummary } from '../FieldUsageSummary'
import { useOnboardingStore } from '@/store/onboardingStore'
import type { OnboardingData } from '@/types'
import type { EnergyType } from '@/store/readingsStore'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'

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

/**
 * Freischalt-Bilanz statt eines blanken „Fertig".
 *
 * Nach dem Schnellstart steht hier bewusst kein 100 % (der Wert misst am
 * vollständigen Fragebogen). Ohne Erklärung liest sich das wie ein Versäumnis –
 * mit Erklärung wie ein Angebot. Deshalb zuerst, was jetzt geht, dann was die
 * nächste Angabe bringt.
 */
function UnlockSummary({ data }: Props) {
  const { t } = useTranslation()
  const pct = profileCompleteness(data)
  const hasRooms = data.rooms.length > 0
  // Ohne Räume laufen sechs der neun Checks; Raumklima, Möbelabstand und der
  // LED-Check brauchen mindestens einen Raum (siehe Konzept Abschnitt 1).
  const ready = hasRooms ? 9 : 6
  const visitedSections = useOnboardingStore((s) => s.visitedSections)
  const next = nextSection(data, visitedSections)

  return (
    <Card className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4 shrink-0" />
        {t('onboarding.step8.unlockTitle')}
      </p>
      <p className="text-sm text-foreground">
        {pct >= 100
          ? t('onboarding.step8.unlockComplete')
          : t('onboarding.step8.unlockProgress', { pct })}
      </p>
      <p className="flex items-start gap-1.5 text-sm text-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        {t('onboarding.step8.unlockReady', { count: ready })}
      </p>
      {!hasRooms && (
        <p className="text-sm text-muted">{t('onboarding.step8.unlockOpenRooms')}</p>
      )}
      {next && (
        <p className="text-sm text-muted">
          {t('onboarding.step8.unlockNext', { section: t(next.titleKey) })}
        </p>
      )}
    </Card>
  )
}

export function Step8Review({ data }: Props) {
  const { t, i18n } = useTranslation()

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
    .filter((r) => Boolean(r.heatTransfer))
    .map(
      (r) =>
        `${t(`onboarding.step3.roomTypes.${r.type}`)}: ${t(`onboarding.step5.${r.heatTransfer}`)}`,
    )
    .join(', ')

  const goalsSummary = data.goals
    .map((g) => t(`onboarding.step1.goalOptions.${g}`))
    .join(', ')

  const isDetailed = data.mode === 'detailed'

  // Verbrauchspreise (zentral aus dem Tarif-Store; je nach Profil relevante Träger).
  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })
  const tariff = useTariffStore.getState()
  const priceTypes: EnergyType[] = ['electricity', 'water']
  if (data.heatGenerators.includes('gas_boiler')) priceTypes.push('gas')
  if (data.heatGenerators.includes('oil_boiler')) priceTypes.push('oil')
  if (data.heatGenerators.includes('pellets')) priceTypes.push('pellets')
  if (data.heatGenerators.includes('heat_pump')) priceTypes.push('heat_pump')

  return (
    <div className="space-y-4">
      <UnlockSummary data={data} />

      {/* Direkt nach der Freischalt-Bilanz: erst was jetzt geht, dann wofuer
          die Angaben gebraucht werden. Danach erst die Auflistung des
          Eingetragenen. */}
      <FieldUsageSummary />

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
          <ReviewRow label={t('onboarding.step8.labels.floors')} value={data.floors} />
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
        {/* PV steht bewusst ohne `isDetailed`: Die Frage wird im Schnellstart
            genauso gestellt (Abschnitt „heating" ist `quick: true`), also muss
            die Antwort auch dort in der Zusammenfassung stehen. Der Kamin, der
            hier danebenstand, wird nicht mehr gefragt. */}
        <ReviewRow
          label={t('onboarding.step8.labels.hasPV')}
          value={t(`onboarding.step4.pvOptions.${data.hasPV}`)}
        />
      </ReviewSection>

      {data.rooms.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.heatTransfer')}>
          <p className="text-sm text-foreground">{heatTransferSummary || '—'}</p>
        </ReviewSection>
      )}

      {/* Die Smart-Home-Zeile, die hier danebenstand, ist entfallen: Die Frage
          wird nicht mehr gestellt (05.09.2026). Die Messgeräte-Zeile bleibt
          für Bestandsprofile, die noch welche eingetragen haben – neu befüllt
          wird `instruments` seit dem 04.09.2026 nicht mehr. */}
      {data.instruments.length > 0 && (
        <ReviewSection title={t('onboarding.step8.sections.instruments')}>
          <p className="text-sm text-foreground">{instrumentsSummary || '—'}</p>
        </ReviewSection>
      )}

      <ReviewSection title={t('onboarding.prices.title')}>
        {priceTypes.map((type) => {
          const meta = PRICE_META[type]
          if (!meta) return null
          const entry = resolvePrice(tariff, type)
          const suffix = entry.custom ? '' : ` · ${t('onboarding.prices.standard')}`
          return (
            <ReviewRow
              key={type}
              label={t(`monitoring.energyTypes.${type}`)}
              value={`${numFmt.format(entry.work)} ${meta.priceUnit}${suffix}`}
            />
          )
        })}
      </ReviewSection>

      <ReviewSection title={t('onboarding.step8.sections.location')}>
        <ReviewRow
          label={t('onboarding.step8.labels.postalCode')}
          value={data.postalCode || '—'}
        />
      </ReviewSection>
    </div>
  )
}
