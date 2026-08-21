import { useTranslation } from 'react-i18next'
import { scalePosition } from './homeStage'

/**
 * Effizienz-Skala mit Marke für den eigenen Kennwert.
 *
 * Leiht sich bewusst die Bildsprache, die in Deutschland jeder kennt, der je
 * eine Wohnung gemietet hat: ein rotes Feld erklärt in einer Sekunde, wofür es
 * sonst drei Sätze bräuchte.
 *
 * **Sie ist ausdrücklich KEIN Energieausweis.** Der amtliche Ausweis folgt
 * einem genormten Rechenverfahren; hier steht der gemessene Zählerverbrauch
 * inklusive Warmwasser und ohne Klimabereinigung. Die Beschriftung darunter
 * sagt das, und sie ist nicht optional – ohne sie wäre die Anleihe
 * irreführend.
 *
 * Die Farben stammen aus der Sache, nicht aus der Marke, und sind deshalb in
 * allen Themes gleich. Getrennt wahrnehmbar bleibt die Skala auch ohne
 * Farbsehen: Position und Beschriftung tragen die Aussage, nicht der Farbton.
 */

/** Klassen der Skala mit Breite (relativ) und Farbe. */
const CLASSES = [
  { label: 'A+', flex: 1, color: '#0a7d3c' },
  { label: 'A', flex: 1, color: '#2f9e2f' },
  { label: 'B', flex: 1.2, color: '#77bb1f' },
  { label: 'C', flex: 1.4, color: '#c3cf14' },
  { label: 'D', flex: 1.6, color: '#f2d40c' },
  { label: 'E', flex: 1.6, color: '#f0a712' },
  { label: 'F', flex: 1.4, color: '#e5701c' },
  { label: 'G', flex: 1.2, color: '#d23d21' },
  { label: 'H', flex: 1, color: '#a51c1c' },
] as const

interface EfficiencyBandProps {
  /** Üblicher Wert für dieses Gebäude (kWh/m²·a) – die blasse Marke. */
  benchmark?: number
  /** Eigener gemessener bzw. geschätzter Wert (kWh/m²·a) – die kräftige Marke. */
  own?: number
  /** true → Skala gedämpft, solange es keinen eigenen Wert gibt. */
  dimmed?: boolean
}

export function EfficiencyBand({ benchmark, own, dimmed = false }: EfficiencyBandProps) {
  const { t } = useTranslation()
  const numFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

  return (
    <div>
      {/* Richtwert ÜBER dem Band, eigener Wert darunter. Nebeneinander würden
          sich die Beschriftungen überlappen, sobald beide Werte nah beieinander
          liegen – und genau das ist der Normalfall. */}
      {benchmark !== undefined && (
        <div className="relative h-6">
          <span
            style={{ left: `${scalePosition(benchmark) * 100}%` }}
            className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
          >
            <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-muted">
              {t('home.stage.bandTypical', { value: numFmt.format(benchmark) })}
            </span>
            <span className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-muted" />
          </span>
        </div>
      )}

      <div
        className={`flex h-6 overflow-hidden rounded-md transition-opacity ${dimmed ? 'opacity-50' : ''}`}
        role="img"
        aria-label={t('home.stage.bandAria')}
      >
        {CLASSES.map((c) => (
          <span
            key={c.label}
            style={{ flex: c.flex, backgroundColor: c.color }}
            className="grid place-items-center text-[9px] font-bold text-white"
          >
            {c.label}
          </span>
        ))}
      </div>

      {own !== undefined && (
        <div className="relative mt-1 h-6">
          <span
            style={{ left: `${scalePosition(own) * 100}%` }}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
          >
            <span className="h-0 w-0 border-x-[5px] border-x-transparent border-b-[6px] border-b-foreground" />
            <span className="whitespace-nowrap text-[12px] font-bold tabular-nums text-foreground">
              {t('home.stage.bandYours', { value: numFmt.format(own) })}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
