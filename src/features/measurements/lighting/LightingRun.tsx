import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import type { RoomType } from '@/types'
import { parseRoomKey } from '../rooms'
import { calcLighting, BULB_TYPES, type BulbType } from './lighting'
import type { RunProps } from '../runnerTypes'

/** Typische Brenndauer pro Tag (Stunden) je Raumtyp – nur als Vorbelegung. */
const HOURS_DEFAULT: Partial<Record<RoomType, number>> = {
  living_room: 4,
  kitchen: 3,
  bedroom: 1.5,
  children_room: 2,
  bathroom: 1.5,
  toilet: 0.5,
  guest_toilet: 0.5,
  hallway: 1,
  office: 4,
  bureau: 4,
  staircase: 0.5,
  basement: 0.5,
}

const HOURS_STEP = 0.5
const HOURS_MAX = 12

/** Kleiner +/−-Zähler. */
function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10))
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={`${label} −`}
        className="focus-ring glass grid h-9 w-9 place-items-center rounded-2xl text-foreground transition-transform active:scale-90 disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center font-semibold tabular-nums text-foreground">{value}</span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={`${label} +`}
        className="focus-ring glass grid h-9 w-9 place-items-center rounded-2xl text-foreground transition-transform active:scale-90 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Durchführung des Beleuchtungs-Checks für einen Raum: pro Lampentyp die Anzahl
 * noch nicht auf LED umgestellter Lampen erfassen, dazu die tägliche Brenndauer.
 */
export function LightingRun({ onEvaluate, roomKey }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const parsed = roomKey ? parseRoomKey(roomKey) : null
  const defaultHours = (parsed && HOURS_DEFAULT[parsed.type]) || 2

  const [counts, setCounts] = useState<Record<BulbType, number>>({
    incandescent: 0,
    halogen: 0,
    spot: 0,
  })
  const [hours, setHours] = useState(defaultHours)

  const preview = calcLighting({ counts, hoursPerDay: hours, workPriceCt })
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const hoursFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  function setCount(type: BulbType, v: number) {
    setCounts((c) => ({ ...c, [type]: v }))
  }

  function handleEvaluate() {
    const calc = calcLighting({ counts, hoursPerDay: hours, workPriceCt })
    onEvaluate({
      result: {
        id: 'lighting',
        rating: calc.rating,
        primaryValue: calc.yearlySaving,
        unit: '€/Jahr',
        completedAt: new Date().toISOString(),
        details: {
          yearlySaving: calc.yearlySaving,
          annualKwh: calc.annualKwh,
          totalBulbs: calc.totalBulbs,
          hoursPerDay: hours,
          incandescent: counts.incandescent,
          halogen: counts.halogen,
          spot: counts.spot,
        },
      },
    })
  }

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
                label={t(`measurements.lighting.run.bulbTypes.${type}`)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('measurements.lighting.run.hoursTitle')}
            </p>
            <p className="text-[11px] text-muted">{t('measurements.lighting.run.hoursHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Stepper
              value={hours}
              onChange={setHours}
              min={HOURS_STEP}
              max={HOURS_MAX}
              step={HOURS_STEP}
              label={t('measurements.lighting.run.hoursTitle')}
            />
            <span className="text-sm text-muted">{t('measurements.lighting.run.hoursUnit')}</span>
          </div>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">
          {t('measurements.lighting.run.hoursValue', { hours: hoursFmt.format(hours) })}
        </p>
      </div>

      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <span className="text-sm font-medium text-muted">
          {t('measurements.lighting.run.preview')}
        </span>
        <span className="text-lg font-bold tabular-nums text-foreground">
          {t('measurements.lighting.run.previewValue', {
            value: eurFmt.format(preview.yearlySaving),
          })}
        </span>
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
