import { useTranslation } from 'react-i18next'

export interface Metric {
  label: string
  /** Bereits formatierter Wert inklusive Einheit. */
  value: string
  /**
   * true, wenn der Wert hochgerechnet ist statt gemessen.
   *
   * Ohne diese Unterscheidung sehen eine direkt gemessene Menge und eine
   * Jahres-Hochrechnung aus Annahmewerten gleich belastbar aus – die Optik
   * suggeriert dann eine Sicherheit, die nur der gemessene Wert hat.
   */
  estimated?: boolean
}

/** Kennzahlen-Reihe unter dem Hero. Zwei oder drei Kacheln nebeneinander. */
export function MetricTiles({ metrics }: { metrics: Metric[] }) {
  const { t } = useTranslation()
  if (metrics.length === 0) return null

  return (
    <div className={`grid gap-2 ${metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className="glass flex flex-col items-center justify-start gap-0.5 rounded-2xl px-2 py-3 text-center"
        >
          <span className="text-[11px] leading-tight text-muted">{m.label}</span>
          <span className="text-base font-semibold tabular-nums text-foreground">{m.value}</span>
          {m.estimated && (
            <span className="text-[10px] leading-tight text-muted">
              {t('measurements.common.estimated')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
