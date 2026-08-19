import { useTranslation } from 'react-i18next'
import { Sofa, Check, Info, Ruler, Link2 } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { DEFAULT_COMFORT_BAND } from '../room_temperature/roomClimate'
import { RATING_COLOR } from '../rating'
import { instanceKey } from '../rooms'
import type { ResultProps } from '../runnerTypes'
import { contextNotes } from './context'
import {
  ALL_FINDING_KEYS,
  rateFurniture,
  DISTANCE_TARGET_CM,
  type FindingKey,
  type FurnitureAnswer,
  type FurnitureAnswers,
} from './furnitureSpacing'

/**
 * Ergebnis des Möbel-Abstands-Checks: qualitative 4-stufige Einordnung und –
 * das Wesentliche – die **konkret zutreffenden** Befunde mit Begründung und
 * Handlung, wichtigster zuerst. Kein €-Wert: Für die Wirkung eines verdeckten
 * Heizkörpers gibt es keine belastbare Kostenbasis, eine Zahl wäre Scheinwissen.
 *
 * Ergebnisse aus älteren App-Ständen haben keine Einzelantworten gespeichert;
 * für sie bleibt die frühere allgemeine Empfehlungsliste stehen.
 */
export function FurnitureSpacingResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const underfloor = (result.details?.underfloor ?? 0) === 1
  const color = RATING_COLOR[result.rating]
  // Über alle bekannten Befunde lesen: Welche Fragen gestellt wurden, hängt vom
  // Raumtyp ab und kann sich zwischen App-Ständen geändert haben.
  const answers: FurnitureAnswers = {}
  let hasAnswers = false
  for (const key of ALL_FINDING_KEYS) {
    const value = result.details?.[`ans_${key}`]
    if (value === undefined) continue
    answers[key] = value as FurnitureAnswer
    hasAnswers = true
  }
  const findings = hasAnswers ? rateFurniture(answers).findings : []

  // Altbestand ohne Einzelantworten: frühere, allgemeine Empfehlungen.
  const legacyTips = hasAnswers
    ? []
    : (t(`measurements.furniture_spacing.result.tips.${underfloor ? 'underfloor' : 'radiator'}`, {
        returnObjects: true,
      }) as string[])

  const allClear = hasAnswers && findings.length === 0
  const distanceCm = result.details?.distanceCm

  // Raumklima-Ergebnis desselben Raums und Wärmeerzeuger aus dem Profil: Erst
  // daraus entstehen Aussagen, die diese Messung allein nicht hergibt.
  const climate = useMeasurementsStore(
    (s) => s.results[instanceKey('room_temperature', result.roomKey)],
  )
  const heatPump = useOnboardingStore((s) => s.data.heatGenerators.includes('heat_pump'))
  const notes = contextNotes(findings, {
    roomTempC: climate?.details?.temperature ?? climate?.primaryValue,
    comfortMinC: climate?.details?.bandMin ?? (climate ? DEFAULT_COMFORT_BAND.min : undefined),
    heatPump,
  })

  return (
    <div className="space-y-4">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` }}
        />
        <div className="relative flex flex-col items-center gap-2 py-1 text-center">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Sofa className="h-6 w-6" />
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
            }}
          >
            {t(`measurements.furniture_spacing.result.ratings.${result.rating}`)}
          </span>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {t(`measurements.furniture_spacing.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      {distanceCm !== undefined && (
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Ruler className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t('measurements.furniture_spacing.result.distanceTitle')}
              </p>
              <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                {distanceCm}
                <span className="ml-1 text-sm font-medium text-muted">
                  {t('measurements.furniture_spacing.run.distanceUnit')}
                </span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {t('measurements.furniture_spacing.result.distanceContext', {
              target: DISTANCE_TARGET_CM,
            })}
          </p>
        </div>
      )}

      {findings.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t('measurements.furniture_spacing.result.findingsTitle')}
          </h3>
          <ul className="space-y-4">
            {findings.map((f: { key: FindingKey; level: string }) => (
              <li key={f.key}>
                <p className="text-sm font-semibold text-foreground">
                  {t(`measurements.furniture_spacing.result.findings.${f.key}.${f.level}`)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {t(`measurements.furniture_spacing.result.findings.${f.key}.why`)}
                </p>
                <p className="mt-1.5 flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {t(`measurements.furniture_spacing.result.findings.${f.key}.action`)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Link2 className="h-4 w-4" />
            {t('measurements.furniture_spacing.result.notesTitle')}
          </h3>
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note} className="text-sm leading-relaxed text-foreground">
                {t(`measurements.furniture_spacing.result.notes.${note}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {allClear && (
        <div className="glass rounded-3xl p-4">
          <p className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t('measurements.furniture_spacing.result.allClear')}</span>
          </p>
        </div>
      )}

      {legacyTips.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t('measurements.furniture_spacing.result.tipsTitle')}
          </h3>
          <ul className="space-y-2.5">
            {legacyTips.map((tip) => (
              <li key={tip} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {findings.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Info className="h-4 w-4" />
            {t('measurements.furniture_spacing.result.mechanismTitle')}
          </h3>
          <p className="text-xs leading-relaxed text-muted">
            {t('measurements.furniture_spacing.result.mechanism')}
          </p>
        </div>
      )}
    </div>
  )
}
