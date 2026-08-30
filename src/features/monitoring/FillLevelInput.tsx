import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { fromPercent, toPercent } from './fillLevel'

interface FillLevelInputProps {
  /** Aktueller Füllstand in der Einheit des Trägers. */
  value: number
  /** Fassungsvermögen; ohne Angabe ist `value` der Prozentwert selbst. */
  capacity?: number
  /** Einheit des Trägers (l, kg, m³). */
  unit: string
  /** Typ-eigener Akzent für Füllung und Regler. */
  accent: string
  onChange: (value: number) => void
}

/**
 * Füllstands-Eingabe für Vorratszähler: eine Tank-Silhouette, die sich antippen
 * und ziehen lässt, darunter ein Regler.
 *
 * Das Zählwerk aus `OdometerInput` ist hier die falsche Metapher – wer an
 * einem Öltank abliest, liest keine sechs Ziffern ab, sondern schätzt einen
 * Stand an Peilstab oder Schwimmeranzeige. Deshalb Prozent als Leitgröße und
 * die Menge als Text darunter, nicht umgekehrt.
 *
 * Der Regler trägt die Bedienung per Tastatur und für Screenreader; die
 * Silhouette ist die dazu gehörende Anzeige, die zusätzlich auf Zeigen und
 * Ziehen reagiert. Beide schreiben denselben Wert.
 */
export function FillLevelInput({
  value,
  capacity,
  unit,
  accent,
  onChange,
}: FillLevelInputProps) {
  const { t, i18n } = useTranslation()
  const sliderId = useId()
  const percent = toPercent(value, capacity)
  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  /** Setzt den Stand aus der y-Position innerhalb der Silhouette (oben = voll). */
  function setFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.height <= 0) return
    const fromBottom = (rect.bottom - event.clientY) / rect.height
    onChange(fromPercent(Math.min(100, Math.max(0, fromBottom * 100)), capacity))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-5">
        {/* Tank-Silhouette: füllt sich von unten, Zeigen/Ziehen setzt den Stand. */}
        <div
          className="relative h-40 w-24 shrink-0 cursor-pointer touch-none overflow-hidden rounded-2xl border-2 border-border bg-surface-2/60"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setFromPointer(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e)
          }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-100"
            style={{ height: `${percent}%`, background: accent, opacity: 0.85 }}
          />
          {/* Viertel-Markierungen wie an einer Peilstab-Skala. */}
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute inset-x-0 border-t border-dashed border-border/70"
              style={{ bottom: `${mark}%` }}
            />
          ))}
        </div>

        <div className="min-w-0 pb-2">
          <p className="text-4xl font-bold tabular-nums leading-none text-foreground">
            {Math.round(percent)}
            <span className="ml-1 text-xl font-medium text-muted">%</span>
          </p>
          {capacity !== undefined && capacity > 0 ? (
            <p className="mt-2 text-sm text-muted">
              {numFmt.format(fromPercent(percent, capacity))} {unit}
              <br />
              {t('monitoring.tank.ofCapacity', { total: numFmt.format(capacity), unit })}
            </p>
          ) : (
            <p className="mt-2 max-w-[10rem] text-xs text-muted">
              {t('monitoring.tank.percentOnly')}
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-xs">
        <label htmlFor={sliderId} className="sr-only">
          {t('monitoring.tank.levelLabel')}
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(percent)}
          onChange={(e) => onChange(fromPercent(Number(e.target.value), capacity))}
          className="w-full accent-[var(--fill-accent)]"
          style={{ '--fill-accent': accent } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
