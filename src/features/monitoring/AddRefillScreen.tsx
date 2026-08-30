import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Truck } from 'lucide-react'
import { useReadingsStore, type EnergyType, type MeterConfig } from '@/store/readingsStore'
import { parseDecimalInput, formatDecimalInput } from '@/lib/decimalInput'
import { todayIso } from '@/lib/timeAxis'
import { ENERGY_META } from './energyConfig'
import { counterSeries } from './counterSeries'
import { sortByDate, stats } from './readings'
import { estimateLevelAt } from './fillLevel'

interface AddRefillScreenProps {
  type: EnergyType
  config: MeterConfig | undefined
  onClose: () => void
}

/**
 * Eingabe einer Lieferung: Datum, gelieferte Menge, optional der
 * Rechnungsbetrag und der Stand danach.
 *
 * Die gelieferte Menge ist der Kern – ohne sie ist der Verbrauch im
 * Auffüll-Zeitraum nicht berechenbar (siehe `docs/tank-concept.md`,
 * Abschnitt 3.2). Menge und Betrag stehen beide auf dem Lieferschein, also
 * wird beides genau so erfragt, wie es dort steht.
 */
export function AddRefillScreen({ type, config, onClose }: AddRefillScreenProps) {
  const { t, i18n } = useTranslation()
  const readingsByType = useReadingsStore((s) => s.readings)
  const addRefill = useReadingsStore((s) => s.addRefill)

  const meta = ENERGY_META[type]
  const readings = sortByDate(readingsByType[type] ?? [])
  const last = readings[readings.length - 1]
  const perDay = stats(counterSeries(readings, config)).perDayKwh
  const capacity = config?.capacity

  const [date, setDate] = useState(todayIso())
  const [amountText, setAmountText] = useState('')
  const [costText, setCostText] = useState('')
  // Sobald der Nutzer den Stand danach selbst angefasst hat, wird er nicht mehr
  // aus Menge und Datum nachgeführt – sonst überschriebe die Schätzung seine
  // Korrektur bei jeder weiteren Eingabe.
  const [afterText, setAfterText] = useState<string | null>(null)

  const amount = parseDecimalInput(amountText, i18n.language)
  const cost = parseDecimalInput(costText, i18n.language)

  /** Vorschlag für den Stand danach: geschätzter Stand am Liefertag + Menge. */
  const suggestedAfter =
    last !== undefined && amount !== undefined
      ? Math.min(
          capacity ?? Number.POSITIVE_INFINITY,
          estimateLevelAt(last.value, last.date, date, perDay) + amount,
        )
      : (amount ?? 0)

  const afterValue =
    afterText === null ? suggestedAfter : (parseDecimalInput(afterText, i18n.language) ?? NaN)

  const valid =
    date !== '' &&
    amount !== undefined &&
    amount > 0 &&
    Number.isFinite(afterValue) &&
    afterValue >= 0

  function handleSave() {
    if (!valid || amount === undefined) return
    addRefill(type, {
      date,
      amount,
      value: afterValue,
      ...(cost !== undefined && cost > 0 ? { costEur: cost } : {}),
    })
    onClose()
  }

  return (
    <div
      className="glass z-50 flex flex-col gap-5 overflow-y-auto p-5 animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: `${meta.accent}1f`, color: meta.accent }}
          >
            <Truck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {t('monitoring.tank.refillTitle')}
            </h2>
            <p className="truncate text-sm text-muted">
              {t(`monitoring.energyTypes.${type}`)} · {meta.unit}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <Field label={t('monitoring.odometer.date')} htmlFor="refill-date">
          <input
            id="refill-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>

        <Field label={t('monitoring.tank.refillAmount')} htmlFor="refill-amount">
          <div className="flex items-center gap-2">
            <input
              id="refill-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="w-40 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted">{meta.unit}</span>
          </div>
        </Field>

        <Field
          label={t('monitoring.tank.refillCost')}
          htmlFor="refill-cost"
          hint={t('monitoring.tank.refillCostHint')}
        >
          <div className="flex items-center gap-2">
            <input
              id="refill-cost"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={costText}
              onChange={(e) => setCostText(e.target.value)}
              className="w-40 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted">€</span>
          </div>
        </Field>

        <Field
          label={t('monitoring.tank.refillAfter')}
          htmlFor="refill-after"
          hint={t('monitoring.tank.refillAfterHint')}
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="refill-after"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={
                afterText ?? formatDecimalInput(Math.round(suggestedAfter), i18n.language)
              }
              onChange={(e) => setAfterText(e.target.value)}
              className="w-40 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted">{meta.unit}</span>
            {capacity !== undefined && capacity > 0 && (
              <button
                type="button"
                onClick={() => setAfterText(formatDecimalInput(capacity, i18n.language))}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2/70"
              >
                {t('monitoring.tank.refillFull')}
              </button>
            )}
          </div>
        </Field>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t('monitoring.odometer.save')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('monitoring.odometer.cancel')}
        </button>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
