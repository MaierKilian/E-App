import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Pencil } from 'lucide-react'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { Stopwatch } from '@/components/ui/Stopwatch'
import { TariffModal } from '@/features/monitoring/TariffModal'
import { calcHotWaterWait, FIXTURE_ORDER, type FixtureType } from './hotWaterWait'
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
        {/* Empfohlene Stellen zuerst und mit Begruendung statt aufgeklebtem
            Badge: Ein Label, das die Haelfte aller Optionen traegt, empfiehlt
            nichts mehr - und die Badges ragten aus der Karte heraus. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {FIXTURE_ORDER.map((key) => {
            const selected = fixture === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFixture(key)}
                aria-pressed={selected}
                className={`focus-ring flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-3 text-sm font-medium transition-[transform,background-color,color] active:scale-[0.97] ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'glass text-foreground hover:bg-surface-2/70'
                }`}
              >
                {t(`measurements.hot_water_wait.fixtures.${key}`)}
                <span
                  className={`text-[11px] font-normal leading-tight ${
                    selected ? 'text-primary-foreground/75' : 'text-muted'
                  }`}
                >
                  {t(`measurements.hot_water_wait.run.fixtureHints.${key}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Schritt 2-5: Anweisung + Stoppuhr (erst nach Auswahl) */}
      {fixture && (
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-muted">
            {t('measurements.hot_water_wait.run.instruction')}
          </p>
          {/* Aussagekraft haengt daran, dass die Leitung ausgekuehlt ist. */}
          <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{t('measurements.hot_water_wait.run.stagnationHint')}</span>
          </p>
          <div className="mt-4">
            <Stopwatch onChange={setSeconds} />
          </div>

          {/* Korrektur ohne komplette Wiederholung der Messung. */}
          {seconds > 0 && (
            <label className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">
                {t('measurements.hot_water_wait.run.manualLabel')}
              </span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={Math.round(seconds)}
                  onChange={(e) => setSeconds(Math.max(0, Number(e.target.value)))}
                  className="focus-ring w-20 rounded-xl bg-surface-2 px-3 py-1.5 text-right font-semibold tabular-nums text-foreground"
                />
                <span className="text-muted">
                  {t('measurements.hot_water_wait.result.secondsUnit')}
                </span>
              </span>
            </label>
          )}
        </div>
      )}

      {/* Der Primaerbutton erscheint erst, wenn er etwas tun kann; vorher
          steht dort, was noch fehlt - statt einer grauen, toten Schaltflaeche
          unter zwei Dritteln leerer Seite. */}
      {canEvaluate ? (
        <button
          type="button"
          onClick={handleEvaluate}
          className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
        >
          {t('measurements.common.evaluate')}
        </button>
      ) : (
        <p className="px-1 text-center text-sm text-muted">
          {t(
            fixture
              ? 'measurements.hot_water_wait.run.hintStopwatch'
              : 'measurements.hot_water_wait.run.hintFixture',
          )}
        </p>
      )}

      {/* Der Wasserpreis gehoert zur Auswertung, nicht in den Messablauf. */}
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

      <TariffModal open={priceOpen} onClose={() => setPriceOpen(false)} type="water" />
    </div>
  )
}
