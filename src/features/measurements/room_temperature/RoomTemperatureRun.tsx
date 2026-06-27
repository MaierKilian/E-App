import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import { SelectChip } from '@/components/ui/SelectChip'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { calcRoomClimate, calcRoomTempSaving } from './roomClimate'
import type { DraftLevel } from './roomClimate'
import { annualHeatingCostEur, WARM_WATER_SHARE } from './heatingCost'
import { parseRoomKey } from '../rooms'
import type { RunProps } from '../runnerTypes'

const TEMP_MIN = 10
const TEMP_MAX = 35
const TEMP_DEFAULT = 21
const TEMP_STEP = 0.5

const HUM_MIN = 0
const HUM_MAX = 100
const HUM_DEFAULT = 50
const HUM_STEP = 5

const DRAFT_LEVELS: DraftLevel[] = ['none', 'noticeable', 'strong']

/**
 * Durchführungs-Phase des Raumklima-Checks: Temperatur per Stepper (Pflicht),
 * Luftfeuchte optional über einen Toggle, Zugluft als Chip-Auswahl.
 */
export function RoomTemperatureRun({ onEvaluate, roomKey }: RunProps) {
  const { t, i18n } = useTranslation()

  const [temperature, setTemperature] = useState(TEMP_DEFAULT)
  const [humidityOn, setHumidityOn] = useState(false)
  const [humidity, setHumidity] = useState(HUM_DEFAULT)
  const [draft, setDraft] = useState<DraftLevel>('none')

  const fmtTemp = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(temperature)

  function handleEvaluate() {
    const calc = calcRoomClimate({
      temperature,
      humidity: humidityOn ? humidity : undefined,
      draft,
    })
    const details: Record<string, number> = {
      temperature,
      draft: DRAFT_LEVELS.indexOf(draft),
    }
    if (humidityOn) details.humidity = humidity

    // Anteilige Heiz-Einsparung dieses Raums (nur sinnvoll, wenn zu warm).
    const profile = useOnboardingStore.getState().data
    const heating = annualHeatingCostEur(
      profile.heatGenerators,
      useReadingsStore.getState().readings,
      useTariffStore.getState(),
    )
    const roomType = roomKey ? parseRoomKey(roomKey)?.type : undefined
    const roomEntry = roomType ? profile.rooms.find((r) => r.type === roomType) : undefined
    const saving = calcRoomTempSaving({
      temp: temperature,
      roomType,
      areaSqm: roomEntry?.areaSqm,
      livingArea: profile.livingArea,
      heatingOnlyCostEur:
        heating !== undefined ? heating.costEur * (1 - WARM_WATER_SHARE) : undefined,
    })
    if (saving.deltaT > 0) {
      details.savingDeltaT = saving.deltaT
      details.savingPercent = Math.round(saving.percent * 100)
      if (saving.yearlySaving !== undefined && saving.yearlySaving >= 1) {
        details.yearlySaving = Math.round(saving.yearlySaving)
        details.savingEstimated = saving.areaEstimated || (heating?.estimated ?? true) ? 1 : 0
      }
    }

    onEvaluate({
      result: {
        id: 'room_temperature',
        rating: calc.rating,
        primaryValue: temperature,
        unit: '°C',
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Temperatur */}
      <div className="glass rounded-3xl p-5">
        <span className="font-medium text-foreground">
          {t('measurements.room_temperature.run.tempLabel')}
        </span>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Stepper
            value={temperature}
            min={TEMP_MIN}
            max={TEMP_MAX}
            step={TEMP_STEP}
            onChange={setTemperature}
          />
          <div className="flex min-w-20 items-baseline justify-center gap-1">
            <span className="text-3xl font-bold tabular-nums text-foreground">{fmtTemp}</span>
            <span className="text-sm text-muted">
              {t('measurements.room_temperature.run.tempUnit')}
            </span>
          </div>
        </div>
      </div>

      {/* Luftfeuchte (optional) */}
      <div className="glass rounded-3xl p-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t('measurements.room_temperature.run.humidityToggle')}
          </span>
          <input
            type="checkbox"
            checked={humidityOn}
            onChange={(e) => setHumidityOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        {humidityOn && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Stepper
              value={humidity}
              min={HUM_MIN}
              max={HUM_MAX}
              step={HUM_STEP}
              onChange={setHumidity}
            />
            <div className="flex min-w-20 items-baseline justify-center gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">{humidity}</span>
              <span className="text-sm text-muted">
                {t('measurements.room_temperature.run.humidityUnit')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Zugluft */}
      <div className="glass rounded-3xl p-5">
        <span className="font-medium text-foreground">
          {t('measurements.room_temperature.run.draftLabel')}
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {DRAFT_LEVELS.map((level) => (
            <SelectChip
              key={level}
              label={t(`measurements.room_temperature.run.draftOptions.${level}`)}
              selected={draft === level}
              onClick={() => setDraft(level)}
            />
          ))}
        </div>
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
