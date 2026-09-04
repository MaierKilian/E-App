import { useTranslation } from 'react-i18next'
import { Snowflake } from 'lucide-react'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import { defrostAdvice, freezerTempStatus, readFrostStage } from './freezer'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { AmbientNote } from '../AmbientNote'
import { ambientFor } from '../ambientTemperature'

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Ergebnis des Gefrierschrank-Checks.
 *
 * Oben steht die **Empfehlung** – abtauen oder nicht –, nicht mehr eine Zahl.
 * Vorher stand dort ein geschätzter Euro-Betrag ohne Währungszeichen („≈ 8"
 * über „vermeidbar/Jahr"), der aus einem angenommenen Jahresverbrauch und einem
 * angenommenen Strompreis entstand und beim Standardpreis für alle dasselbe
 * ergab. Die Wirkung des Abtauens steht jetzt als Anteil am Verbrauch darunter.
 *
 * Ältere Ergebnisse tragen den Vereisungsgrad in einem anderen Format – siehe
 * `readFrostStage` – und manche zusätzlich eine echte Vorher/Nachher-Messung
 * (`method: 2`). Diese Eingabe gibt es im Check nicht mehr, gespeicherte
 * Ergebnisse behalten sie aber und werden weiter als Messung ausgewiesen.
 */
export function FreezerResult({ result }: ResultProps) {
  // Standort des Geraets: Die Umgebungstemperatur wird **live** hergeleitet und
  // nicht ins Ergebnis geschrieben. So zieht ein spaeter gemessener Raum den
  // Hinweis nach; ein eingefrorener Wert bliebe auf dem Richtwert stehen.
  const appliances = useOnboardingStore((s) => s.data.appliances)
  const allResults = useMeasurementsStore((s) => s.results)
  const ambient = ambientFor(
    allResults,
    appliances.find((a) => a.id === result.roomKey),
  )
  const { t } = useTranslation()

  const stage = readFrostStage(result.details)
  const advice = defrostAdvice(stage)
  const iced = stage !== 'none'
  // Alte Ergebnisse führten den Anteil nicht mit; dort bleibt die Zeile leer,
  // statt einen Wert zu erfinden.
  const extraPercent = result.details?.extraPercent
  // Nur noch aus Altergebnissen: Der Check erhebt keine Strommessung mehr.
  const measured = (result.details?.method ?? 0) === 2

  const hasTemp = Number.isFinite(result.details?.temperature)
  const temperature = result.details?.temperature ?? 0
  const tempStatus = hasTemp ? freezerTempStatus(temperature) : undefined

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        icon={Snowflake}
        badgeLabel={t(`measurements.freezer.result.frostChips.${stage}`)}
        summary={t(`measurements.freezer.result.advice.${advice}`)}
      />

      {iced && extraPercent !== undefined && extraPercent > 0 && (
        <div className="glass rounded-3xl p-4">
          <p className="text-sm leading-relaxed text-foreground">
            {t(
              measured
                ? 'measurements.freezer.result.effectMeasured'
                : 'measurements.freezer.result.effectEstimated',
              { percent: extraPercent },
            )}
          </p>
        </div>
      )}

      {iced && <Chip label={t('measurements.freezer.result.chips.defrost')} />}

      {hasTemp && tempStatus && (
        <p className="text-sm text-muted">
          {t('measurements.freezer.result.tempHint', {
            value: `${temperature} ${t('measurements.freezer.run.tempUnit')}`,
            status: t(`measurements.freezer.result.tempStatus.${tempStatus}`),
          })}
        </p>
      )}
      <AmbientNote ambient={ambient} />
    </div>
  )
}
