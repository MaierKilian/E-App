import { useTranslation } from 'react-i18next'
import { Sun } from 'lucide-react'
import { RatingBadge } from '@/features/measurements/RatingBadge'
import { CalculationNote } from '@/features/measurements/CalculationNote'
import { HOT_WATER_KWH_PER_PERSON_DAY, type SummerHeatCheck } from './heatingPeriod'

interface Props {
  check: SummerHeatCheck
  /** Einheit des Zählers (m³, l, kg, kWh) – für alle Zahlen dieselbe. */
  unit: string
  persons: number
}

/**
 * „Läuft die Heizung im Sommer mit?" – der Befund aus dem Sommerfenster.
 *
 * Die Karte steht bewusst unter dem Verlaufsdiagramm und nicht bei den
 * Kennzahlen: Sie beantwortet die Frage, die das hinterlegte Heizperioden-Band
 * im Diagramm aufwirft. Wer dort sieht, dass die Linie auch im hellen Bereich
 * steigt, findet hier, was das bedeutet und was zu tun ist.
 *
 * Die Zahl steht vorn, die Herleitung im Aufklapper – dieselbe Ordnung wie bei
 * den Mess-Ergebnissen.
 */
export function SummerHeatCard({ check, unit, persons }: Props) {
  const { t, i18n } = useTranslation()
  const fmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })
  const fmtCoarse = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <section className="space-y-3">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
              <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {t('monitoring.summerCheck.title')}
            </h3>
          </div>
          {/* Eigenes Label statt der neutralen Skala: „Gut" allein sagt hier
              nicht, worum es ging – der Befund benennt sich selbst. */}
          <RatingBadge
            rating={check.rating}
            label={t(`monitoring.summerCheck.verdict.${check.rating}`)}
          />
        </div>

        <p className="mt-3 text-sm leading-snug text-muted">
          {t(`monitoring.summerCheck.text.${check.rating}`, {
            factor: fmt.format(check.ratio),
          })}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-2/60 px-3 py-2">
            <dt className="text-xs font-medium text-muted">
              {t('monitoring.summerCheck.measured')}
            </dt>
            <dd className="text-sm font-semibold text-foreground">
              {t('monitoring.summerCheck.perDay', {
                value: fmt.format(check.measuredPerDay),
                unit,
              })}
            </dd>
          </div>
          <div className="rounded-2xl bg-surface-2/60 px-3 py-2">
            <dt className="text-xs font-medium text-muted">
              {t('monitoring.summerCheck.expected')}
            </dt>
            <dd className="text-sm font-semibold text-foreground">
              {t('monitoring.summerCheck.perDay', {
                value: fmt.format(check.expectedPerDay),
                unit,
              })}
            </dd>
          </div>
        </dl>

        {/* Nur bei einem echten Überschuss: Ohne ihn wäre „0 zusätzlich" eine
            Zahl ohne Aussage. */}
        {check.excessPerSummer !== undefined && check.rating !== 'good' && (
          <p className="mt-3 text-sm text-foreground">
            {t('monitoring.summerCheck.excess', {
              value: fmtCoarse.format(check.excessPerSummer),
              unit,
            })}
          </p>
        )}
      </div>

      <CalculationNote
        formula={t('monitoring.summerCheck.calc.formula')}
        rows={[
          {
            label: t('monitoring.summerCheck.calc.window'),
            value: t('monitoring.summerCheck.calc.windowValue', { days: check.daysCovered }),
            measured: true,
          },
          {
            label: t('monitoring.summerCheck.calc.measured'),
            value: t('monitoring.summerCheck.perDay', {
              value: fmt.format(check.measuredPerDay),
              unit,
            }),
            measured: true,
          },
          {
            label: t('monitoring.summerCheck.calc.persons'),
            value: String(persons),
            measured: true,
          },
          {
            label: t('monitoring.summerCheck.calc.hotWater'),
            value: t('monitoring.summerCheck.calc.hotWaterValue', {
              value: fmt.format(HOT_WATER_KWH_PER_PERSON_DAY),
            }),
          },
        ]}
        note={t('monitoring.summerCheck.calc.note')}
      />
    </section>
  )
}
