import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useTariffStore } from '@/store/tariffStore'
import { parseRoomKey } from '../rooms'
import { displaySavingEur, savingRange } from '../savingsDisplay'
import {
  calcLighting,
  usageHours,
  BULB_TYPES,
  USAGE_LEVELS,
  MAX_PAYBACK_MONTHS,
  type BulbType,
  type UsageLevel,
} from './lighting'
import { baseHoursFor, lampHintFor } from './roomLampDefaults'
import type { RunProps } from '../runnerTypes'

/** Kleiner +/−-Zähler. */
function Stepper({
  value,
  onChange,
  muted,
  label,
}: {
  value: number
  onChange: (v: number) => void
  muted?: boolean
  label: string
}) {
  const clamp = (v: number) => Math.min(99, Math.max(0, v))
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 0}
        aria-label={`${label} −`}
        className="focus-ring glass grid h-9 w-9 place-items-center rounded-2xl text-foreground transition-transform active:scale-90 disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className={`w-10 text-center font-semibold tabular-nums transition-colors ${
          muted ? 'text-muted' : 'text-foreground'
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= 99}
        aria-label={`${label} +`}
        className="focus-ring glass grid h-9 w-9 place-items-center rounded-2xl text-foreground transition-transform active:scale-90 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Durchführung des Beleuchtungs-Checks für einen Raum.
 *
 * Zwei Entscheidungen prägen den Ablauf:
 *
 * 1. **Vorbelegt statt leer.** Der Raumtyp bringt eine typische Bestückung mit,
 *    die der Nutzer korrigiert. Drei Zähler auf 0 wären eine leere Maske – und
 *    ein Ergebnis von „0 €", bevor überhaupt etwas passiert ist.
 * 2. **Ein unangetasteter Default ist keine Nutzerangabe.** Die Brenndauer ist
 *    der größte Unsicherheitsfaktor der Rechnung und auf dem Schirm unsichtbar.
 *    Deshalb ist keine Nutzungsstufe vorausgewählt: Erst die bewusste Wahl macht
 *    den Euro-Betrag verteidigbar (siehe `savingsDisplay.ts`). Vorher zeigt der
 *    Check die gezählte Größe statt einer Zahl, die niemand begründen kann.
 */
export function LightingRun({ onEvaluate, roomKey }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const roomType = roomKey ? parseRoomKey(roomKey)?.type : undefined
  const baseHours = baseHoursFor(roomType)

  const [counts, setCounts] = useState<Record<BulbType, number>>(() => lampHintFor(roomType))
  // Welche Zähler der Nutzer selbst angefasst hat – nur die stehen in voller
  // Schriftfarbe. Der Rest bleibt sichtbar als Vorschlag markiert.
  const [touched, setTouched] = useState<Partial<Record<BulbType, boolean>>>({})
  const [usage, setUsage] = useState<UsageLevel | null>(null)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)

  const hours = usageHours(baseHours, usage ?? 'normal')
  const calc = calcLighting({ counts, hoursPerDay: hours, workPriceCt })

  // Euro nur, wenn die Nutzung bestätigt ist **und** der Betrag über der
  // Anzeigeschwelle der App liegt. Beides zusammen ist die Hausregel.
  const shownEur = usage ? displaySavingEur(calc.yearlySaving) : undefined
  const range = shownEur !== undefined ? savingRange(calc.yearlySaving) : undefined

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const hoursFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  function setCount(type: BulbType, v: number) {
    setCounts((c) => ({ ...c, [type]: v }))
    setTouched((s) => ({ ...s, [type]: true }))
  }

  function evaluate(next: Record<BulbType, number>, level: UsageLevel | null) {
    const effectiveHours = usageHours(baseHours, level ?? 'normal')
    const result = calcLighting({ counts: next, hoursPerDay: effectiveHours, workPriceCt })
    onEvaluate({
      result: {
        id: 'lighting',
        rating: result.rating,
        primaryValue: result.yearlySaving,
        unit: '€/Jahr',
        completedAt: new Date().toISOString(),
        details: {
          yearlySaving: result.yearlySaving,
          annualKwh: result.annualKwh,
          totalBulbs: result.totalBulbs,
          investEur: result.investEur,
          ...(result.paybackMonths !== undefined ? { paybackMonths: result.paybackMonths } : {}),
          hoursPerDay: effectiveHours,
          workPriceCt,
          // Ohne bewusst gewählte Nutzung beruht der Betrag auf einer
          // App-Annahme – dann darf ihn nirgends jemand als € ausweisen.
          savingEstimated: level ? 0 : 1,
          incandescent: next.incandescent,
          halogen: next.halogen,
          spot: next.spot,
        },
      },
    })
  }

  const allLed = { incandescent: 0, halogen: 0, spot: 0 }

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <p className="mb-1 text-sm font-semibold text-foreground">
          {t('measurements.lighting.run.bulbsTitle')}
        </p>
        <p className="mb-4 text-xs text-muted">{t('measurements.lighting.run.bulbsHint')}</p>
        <div className="space-y-3">
          {BULB_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t(`measurements.lighting.run.bulbTypes.${type}`)}
                </p>
                <p className="text-[11px] text-muted">
                  {t(`measurements.lighting.run.bulbExamples.${type}`)}
                </p>
              </div>
              <Stepper
                value={counts[type]}
                onChange={(v) => setCount(type, v)}
                muted={!touched[type] && counts[type] > 0}
                label={t(`measurements.lighting.run.bulbTypes.${type}`)}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setCounts(allLed)
            setTouched({ incandescent: true, halogen: true, spot: true })
            evaluate(allLed, usage)
          }}
          className="focus-ring mt-4 w-full rounded-2xl border border-border/60 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('measurements.lighting.run.allLed')}
        </button>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="text-sm font-semibold text-foreground">
          {t('measurements.lighting.run.usageTitle')}
        </p>
        <p className="mb-3 text-xs text-muted">{t('measurements.lighting.run.usageHint')}</p>
        <div className="flex gap-2">
          {USAGE_LEVELS.map((level) => {
            const active = usage === level
            return (
              <button
                key={level}
                type="button"
                onClick={() => setUsage(level)}
                aria-pressed={active}
                className={`focus-ring flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform] active:scale-[0.97] ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'glass text-foreground hover:text-primary'
                }`}
              >
                {t(`measurements.lighting.run.usageLevels.${level}`)}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {usage
            ? t('measurements.lighting.run.usageChosen', { hours: hoursFmt.format(hours) })
            : t('measurements.lighting.run.usageOpen')}
        </p>
      </div>

      <div className="glass rounded-3xl p-4">
        {calc.totalBulbs === 0 ? (
          <p className="text-sm font-medium text-foreground">
            {t('measurements.lighting.run.stateDone')}
          </p>
        ) : !usage ? (
          <p className="text-sm text-muted">
            {t('measurements.lighting.run.stateNeedsUsage', { count: calc.totalBulbs })}
          </p>
        ) : range ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-muted">
                {t('measurements.lighting.run.savingLabel')}
              </span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {t('measurements.lighting.run.savingRange', {
                  low: numFmt.format(range.low),
                  high: numFmt.format(range.high),
                })}
              </span>
            </div>
            <p className="mt-1 text-right text-[11px] text-muted">
              {calc.paybackMonths !== undefined && calc.paybackMonths <= MAX_PAYBACK_MONTHS
                ? t('measurements.lighting.run.payback', {
                    invest: numFmt.format(calc.investEur),
                    months: calc.paybackMonths,
                  })
                : t('measurements.lighting.run.paybackSlow', {
                    invest: numFmt.format(calc.investEur),
                  })}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-muted">
                {t('measurements.lighting.run.savingLabel')}
              </span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {t('measurements.lighting.run.savingKwh', {
                  kwh: numFmt.format(calc.annualKwh),
                })}
              </span>
            </div>
            <p className="mt-1 text-right text-[11px] text-muted">
              {t('measurements.lighting.run.savingSmall')}
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => setAssumptionsOpen(true)}
          className="focus-ring mt-3 inline-flex items-center gap-1 rounded-full text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Info className="h-3 w-3" />
          {t('measurements.lighting.run.assumptions', {
            price: numFmt.format(workPriceCt),
            hours: hoursFmt.format(hours),
          })}
        </button>
      </div>

      <button
        type="button"
        onClick={() => evaluate(counts, usage)}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
      >
        {t('measurements.common.evaluate')}
      </button>

      <Modal
        open={assumptionsOpen}
        onClose={() => setAssumptionsOpen(false)}
        title={t('measurements.lighting.run.assumptionsTitle')}
      >
        <ul className="space-y-3">
          {(
            t('measurements.lighting.run.assumptionsItems', {
              returnObjects: true,
              price: numFmt.format(workPriceCt),
              hours: hoursFmt.format(hours),
            }) as string[]
          ).map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
