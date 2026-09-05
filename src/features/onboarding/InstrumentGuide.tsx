import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  Droplets,
  Plug,
  Ruler,
  Thermometer,
  Timer,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { InstrumentType } from '@/types'
import {
  instrumentsToShow,
  measurementsWithoutRequiredInstrument,
  type InstrumentNeedSummary,
} from '@/features/measurements/instrumentNeeds'
import { getModelTypes } from './instrumentOptions'

const INSTRUMENT_ICONS: Record<InstrumentType, LucideIcon> = {
  temperature_sensor: Thermometer,
  distance_meter: Ruler,
  co2_sensor: Wind,
  humidity_sensor: Droplets,
  power_meter: Plug,
  none: Thermometer,
  unknown: Thermometer,
}

/** Namen der genannten Messungen, in der Reihenfolge des Katalogs. */
function useMeasurementNames() {
  const { t } = useTranslation()
  return (ids: string[]) => ids.map((id) => t(`measurements.${id}.title`)).join(' · ')
}

/**
 * Ein Gerät: Name, wofür es gebraucht wird, und – aufklappbar – die Bauarten.
 *
 * Die Zuordnung „wofür" steht offen, die Bauarten klappen zu. Wer wissen will,
 * ob er etwas anschaffen muss, hat die Antwort ohne einen Klick; wer schon
 * weiß, dass er ein Thermometer braucht, sucht die Bauart gezielt.
 */
function InstrumentCard({ summary }: { summary: InstrumentNeedSummary }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const names = useMeasurementNames()

  const Icon = INSTRUMENT_ICONS[summary.type]
  const models = getModelTypes(summary.type)

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface/40">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            summary.role === 'required' ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">
              {t(`onboarding.step6.instruments.${summary.type}`)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                summary.role === 'required'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-2 text-muted'
              }`}
            >
              {t(`onboarding.step6.guide.roles.${summary.role}`)}
            </span>
          </div>

          {summary.requiredFor.length > 0 && (
            <p className="text-xs leading-snug text-muted">
              <span className="font-medium text-foreground">
                {t('onboarding.step6.guide.requiredFor')}
              </span>{' '}
              {names(summary.requiredFor)}
            </p>
          )}
          {summary.optionalFor.length > 0 && (
            <p className="text-xs leading-snug text-muted">
              <span className="font-medium text-foreground">
                {t('onboarding.step6.guide.optionalFor')}
              </span>{' '}
              {names(summary.optionalFor)}
            </p>
          )}
        </div>
      </div>

      {models.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="focus-ring flex w-full items-center justify-between gap-2 border-t border-border/50 px-3.5 py-2.5 text-left"
          >
            <span className="text-xs font-medium text-muted">
              {t('onboarding.step6.guide.variantsToggle', { count: models.length })}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>

          {open && (
            <ul className="animate-panel-in space-y-2 border-t border-border/50 px-3.5 pb-3.5 pt-3">
              {models.map((model) => (
                <li key={model}>
                  <p className="text-xs font-semibold text-foreground">
                    {t(`onboarding.step6.modelTypes.${summary.type}.${model}`)}
                  </p>
                  <p className="text-xs leading-snug text-muted">
                    {t(`onboarding.step6.guide.variantNotes.${summary.type}.${model}`)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

/**
 * „Was du zum Messen brauchst" – die Geräte-Übersicht im Fragebogen.
 *
 * Steht an der Stelle, an der die App bis dahin *abgefragt* hat, welche
 * Messgeräte vorhanden sind. Diese Frage hatte genau eine Wirkung (einen
 * vorangehakten Schalter im Möbelabstand-Check) und stellte 24 Bauarten zur
 * Wahl, die nie jemand gelesen hat. Die Information fließt jetzt in die
 * Richtung, in der sie zählt: Die App weiß, was ihre Checks brauchen – der
 * Nutzer weiß es nicht.
 *
 * Der Inhalt ist aus `MEASUREMENT_CATALOG` abgeleitet, nicht abgeschrieben:
 * Was hier steht, ist genau das, was die Checks tatsächlich verlangen.
 */
export function InstrumentGuide() {
  const { t } = useTranslation()
  const names = useMeasurementNames()
  // Ohne die Geräte, die keine Messung liest: Die Seite beantwortet „was
  // brauche ich?", und ein ungenutztes Gerät braucht man nicht.
  const summaries = instrumentsToShow()
  const noGear = measurementsWithoutRequiredInstrument()

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {summaries.map((summary) => (
          <InstrumentCard key={summary.type} summary={summary} />
        ))}
      </div>

      {/* Haushaltsmittel: gehören zur Frage „was brauche ich", stehen aber in
          keiner Geräteliste – der Messbecher entscheidet über den Duschkopf-
          Check, und die Stoppuhr bringt die App selbst mit. */}
      <div className="rounded-2xl border border-border/60 bg-surface/40 px-3.5 py-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Timer className="h-4 w-4 text-muted" aria-hidden="true" />
          {t('onboarding.step6.guide.household.title')}
        </p>
        <ul className="space-y-1">
          {(
            t('onboarding.step6.guide.household.items', { returnObjects: true }) as string[]
          ).map((item) => (
            <li key={item} className="text-xs leading-snug text-muted">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {noGear.length > 0 && (
        <p className="px-1 text-xs leading-snug text-muted">
          <span className="font-medium text-foreground">
            {t('onboarding.step6.guide.noGear')}
          </span>{' '}
          {names(noGear)}
        </p>
      )}
    </div>
  )
}
