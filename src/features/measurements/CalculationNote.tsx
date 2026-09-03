import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Sigma } from 'lucide-react'

/**
 * Eine Zeile der Rechnung: was angenommen oder gemessen wurde.
 *
 * `measured` unterscheidet beides sichtbar. Das ist der Zweck des Aufklappers:
 * Eine Jahreszahl aus einer Messung und eine aus einer Modellannahme sehen im
 * Ergebnis gleich aus, sind aber verschieden belastbar.
 */
export interface CalculationRow {
  label: string
  value: string
  /** true = aus einer Messung dieses Nutzers, nicht aus einer Annahme. */
  measured?: boolean
}

interface Props {
  /** Die Formel in einer Zeile, im Klartext. */
  formula: string
  rows: CalculationRow[]
  /** Schlusssatz, z. B. worauf die Werte kalibriert sind. */
  note?: string
}

/**
 * „So gerechnet" – klappt die Annahmen hinter einer Hochrechnung auf.
 *
 * **Warum aufklappbar und nicht offen.** Die Zahl ist die Aussage, die
 * Herleitung die Fußnote. Offen gestellt drängt sie sich vor das Ergebnis;
 * ganz weggelassen ist sie eine Behauptung, die niemand prüfen kann.
 *
 * Die Werte kommen von der aufrufenden Ansicht und dort aus den Mess-Modulen,
 * nie als Zahl im Text – dieselbe Regel wie bei den Richtwert-Tabellen im
 * Wissensbereich.
 */
export function CalculationNote({ formula, rows, note }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex w-full items-center gap-3 p-5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sigma className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {t('measurements.common.calculation.title')}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="space-y-3 px-5 pb-5">
          <p className="rounded-2xl bg-surface-2/60 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
            {formula}
          </p>
          <dl className="space-y-1.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="min-w-0 text-muted">
                  {row.label}
                  {row.measured && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {t('measurements.common.calculation.measured')}
                    </span>
                  )}
                </dt>
                <dd className="shrink-0 font-medium tabular-nums text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          {note && <p className="text-xs leading-relaxed text-muted">{note}</p>}
        </div>
      )}
    </div>
  )
}
