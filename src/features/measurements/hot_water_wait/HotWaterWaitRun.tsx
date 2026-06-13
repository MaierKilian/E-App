import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Pencil } from 'lucide-react'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { Stopwatch } from '@/components/ui/Stopwatch'
import { TariffModal } from '@/features/monitoring/TariffModal'
import { calcHotWaterWait, FIXTURE_ORDER, FIXTURES, type FixtureType } from './hotWaterWait'
import type { RunProps } from '../runnerTypes'

/**
 * Durchführung: Entnahmestelle wählen (Dusche/Badewanne empfohlen), Wasser auf
 * warm stellen und mit der Stoppuhr die Wartezeit messen. Der Wasserpreis lässt
 * sich für eine genauere Schätzung anpassen.
 */
export function HotWaterWaitRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const waterPrice = useTariffStore((s) => resolvePrice(s, 'water').work)

  const [fixture, setFixture] = useState<FixtureType | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [priceOpen, setPriceOpen] = useState(false)

  const canEvaluate = fixture !== null && seconds > 0
  const priceFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(waterPrice)

  function handleEvaluate() {
    if (!fixture || seconds <= 0) return
    const calc = calcHotWaterWait({ fixture, seconds, waterPriceEurPerM3: waterPrice })
    onEvaluate({
      result: {
        id: 'hot_water_wait',
        rating: calc.rating,
        primaryValue: seconds,
        unit: 's',
        completedAt: new Date().toISOString(),
        // Entnahmestelle als roomKey → eigenes Ergebnis je Stelle.
        roomKey: fixture,
        details: {
          seconds,
          litersPerDraw: calc.litersPerDraw,
          litersPerYear: calc.litersPerYear,
          yearlySaving: calc.yearlySaving,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Schritt 1: Entnahmestelle */}
      <div className="glass rounded-3xl p-5">
        <p className="font-medium text-foreground">{t('measurements.hot_water_wait.run.fixtureLabel')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {FIXTURE_ORDER.map((key) => {
            const selected = fixture === key
            const recommended = FIXTURES[key].recommended
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFixture(key)}
                aria-pressed={selected}
                className={`focus-ring relative flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition-[transform,background-color,color] active:scale-[0.97] ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'glass text-foreground hover:bg-surface-2/70'
                }`}
              >
                {t(`measurements.hot_water_wait.fixtures.${key}`)}
                {recommended && (
                  <span
                    className={`absolute -top-2 right-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      selected ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <Star className="h-2.5 w-2.5" />
                    {t('measurements.hot_water_wait.run.recommended')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Schritt 2-5: Anweisung + Stoppuhr (erst nach Auswahl) */}
      {fixture && (
        <>
          <p className="px-1 text-sm text-muted">{t('measurements.hot_water_wait.run.instruction')}</p>
          <Stopwatch onChange={setSeconds} />

          {/* Wasserpreis (für genauere Schätzung) */}
          <button
            type="button"
            onClick={() => setPriceOpen(true)}
            className="glass flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm"
          >
            <span className="text-muted">{t('measurements.hot_water_wait.run.waterPrice')}</span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="tabular-nums">{priceFmt} €/m³</span>
              <Pencil className="h-3.5 w-3.5 text-muted" />
            </span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>

      <TariffModal open={priceOpen} onClose={() => setPriceOpen(false)} type="water" />
    </div>
  )
}
