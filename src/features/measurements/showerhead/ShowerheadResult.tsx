import { useTranslation } from 'react-i18next'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import { CalculationNote } from '../CalculationNote'
import {
  EFFICIENT_FLOW_LPM,
  GOOD_MAX,
  MINUTES_PER_SHOWER,
  SHOWERS_PER_PERSON_PER_DAY,
  savingShareForFlow,
} from './showerhead'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Kleine Kennzahl-Kachel (Label oben, Wert unten). */
function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Minimale Ergebnis-Phase: großer Durchflusswert + Bewertung, drei Mini-Kacheln,
 * Tipp-Chips und bei medium/high eine Sparduschkopf-Empfehlung samt Ersparnis.
 *
 * Die Ersparnis steht seit dem 05.09.2026 als **Prozentsatz**. Er folgt allein
 * aus dem gemessenen Durchfluss (siehe `savingShareForFlow`), während der
 * frühere Euro-Betrag über Personenzahl, Duschhäufigkeit, Duschdauer,
 * Temperaturhub und Arbeitspreis lief – und über die Warmwasserquelle, die der
 * Check eigens abfragte. Nebenbei behoben: Dieser Betrag war die einzige
 * €-Anzeige der App, die an `isMeasuredSaving` vorbeilief; Empfehlungen,
 * Wirkungs-Summe und Bericht haben ihn längst nicht mehr gezeigt.
 */
export function ShowerheadResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const flow = result.primaryValue
  const liters = result.details?.liters ?? 0
  const seconds = result.details?.seconds ?? 0
  const isGood = result.rating === 'good'

  // Der Prozentsatz steht vorn: Er folgt allein aus dem gemessenen Durchfluss.
  // Die Jahresmenge in Litern dahinter – sie ist echt, aber hochgerechnet über
  // Personen, Duschen pro Tag und Minuten je Dusche.
  //
  // Altergebnisse (vor dem 05.09.2026) tragen kein `savingPct`; es wird
  // deshalb aus dem gespeicherten Durchfluss nachgerechnet, statt sie mit
  // „0 %" abzuspeisen. Gespeicherte Ergebnisse werden nie migriert
  // (siehe CLAUDE.md).
  const litersSaved = result.details?.litersSavedPerYear ?? 0
  const savingPct = result.details?.savingPct ?? Math.round(savingShareForFlow(flow) * 100)
  const showSaving = !isGood && savingPct > 0

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={fmt(flow, 1)}
        unit={t('measurements.showerhead.result.flowUnit')}
        // „Ein Sparaufsatz lohnt sich" war eine Kaufempfehlung ohne Kenntnis
        // von Preis und Einbausituation. Der Text nennt jetzt den gemessenen
        // Wert und die Bedingung, unter der die Maßnahme greift.
        summary={t(`measurements.showerhead.result.summary.${result.rating}`, {
          flow: fmt(flow, 1),
          target: fmt(EFFICIENT_FLOW_LPM),
        })}
      />

      <div className="grid grid-cols-3 gap-2">
        <MiniTile
          label={t('measurements.showerhead.result.mini.liters')}
          value={`${fmt(liters, 1)} ${t('measurements.showerhead.run.litersUnit')}`}
        />
        <MiniTile
          label={t('measurements.showerhead.result.mini.seconds')}
          value={`${fmt(seconds, 1)} ${t('measurements.showerhead.run.secondsUnit')}`}
        />
        <MiniTile
          label={t('measurements.showerhead.result.mini.reference')}
          // Aus dem Mess-Modul, nicht als Text: dieselbe Grenze, nach der auch
          // bewertet wird (siehe Etappe 6 – keine Zahl steht doppelt).
          value={t('measurements.showerhead.result.referenceUpTo', { value: fmt(GOOD_MAX) })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {isGood ? (
          <Chip label={t('measurements.showerhead.result.chips.good')} />
        ) : (
          <>
            <Chip label={t('measurements.showerhead.result.chips.saver')} />
            <Chip label={t('measurements.showerhead.result.chips.time')} />
          </>
        )}
      </div>

      {!isGood && (
        <div className="space-y-2">
          {showSaving && (
            <>
              <p className="text-sm font-semibold text-primary">
                {t('measurements.showerhead.result.savingLabel', {
                  percent: fmt(savingPct),
                  target: fmt(EFFICIENT_FLOW_LPM),
                })}
              </p>
              {litersSaved > 0 && (
                <p className="text-xs text-muted">
                  {t('measurements.showerhead.result.savingLiters', {
                    liters: fmt(litersSaved),
                  })}
                </p>
              )}
            </>
          )}
          {/* Kilians Fund aus der Quellenprüfung – und die Begründung dieses
              Checks überhaupt: Man muss messen, weil das Etikett nichts
              garantiert. */}
          <p className="text-xs leading-relaxed text-muted">
            {t('measurements.showerhead.result.buyingNote', { target: fmt(GOOD_MAX) })}
          </p>
        </div>
      )}

      <CalculationNote
        formula={t('measurements.showerhead.result.calculation.formula')}
        rows={[
          {
            label: t('measurements.showerhead.result.calculation.flow'),
            value: `${fmt(result.primaryValue ?? 0, 1)} l/min`,
            measured: true,
          },
          {
            label: t('measurements.showerhead.result.calculation.reference'),
            value: `${fmt(EFFICIENT_FLOW_LPM)} l/min`,
          },
          // Die beiden Annahmen stehen nur noch unter der Jahresmenge – der
          // Prozentsatz darüber kommt ohne sie aus.
          {
            label: t('measurements.showerhead.result.calculation.showers'),
            value: fmt(SHOWERS_PER_PERSON_PER_DAY),
          },
          {
            label: t('measurements.showerhead.result.calculation.minutes'),
            value: `${fmt(MINUTES_PER_SHOWER)} min`,
          },
        ]}
        note={t('measurements.showerhead.result.calculation.note')}
      />
    </div>
  )
}
