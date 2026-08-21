import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { EnergyType } from '@/store/readingsStore'
import { ENERGY_META } from '@/features/monitoring/energyConfig'
import { TrendBadge } from '@/features/monitoring/MeterTrend'
import { EfficiencyBand } from './EfficiencyBand'
import { YearCurve } from './YearCurve'
import type { HomeStageData } from './homeStage'

/**
 * Die Bühne des Zuhause-Bildschirms: Effizienz-Skala, eine große Zahl,
 * Aufschlüsselung.
 *
 * Bewusst **ohne Glaskarte und ohne getönte Icon-Kachel** – die beiden Muster,
 * die den bisherigen Bildschirm austauschbar wirken ließen. Getrennt wird hier
 * mit Linien und Typografie; Farbe kommt aus der Sache (Skala, Trägerfarben),
 * nicht aus der Marke.
 *
 * Die Bühne wächst mit den Daten (siehe `homeStage.ts`) und springt dabei nie
 * im Layout: Zustand 1 zeigt dieselbe Skala wie Zustand 3, nur mit einer Marke
 * weniger.
 */
export function HomeStage({ stage }: { stage: HomeStageData }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  const hasOwn = stage.ownHeat !== undefined
  const showBand = stage.benchmarkHeat !== undefined || hasOwn

  return (
    <section className="rounded-3xl border border-border bg-surface px-4 py-4">
      {showBand && (
        <>
          <EfficiencyBand
            benchmark={stage.benchmarkHeat}
            own={stage.ownHeat?.value}
            dimmed={!hasOwn}
          />
          <p className="mt-1 text-[11px] leading-tight text-muted">
            {t('home.stage.bandFootnote')}
          </p>
        </>
      )}

      {/* Kein eigener Jahreswert: die Bühne sagt, was ein solches Gebäude
          üblicherweise braucht – eine wahre Aussage statt eines Platzhalters. */}
      {stage.totalCostEur === undefined ? (
        <div className={showBand ? 'mt-4' : ''}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t('home.stage.typicalKicker')}
          </p>
          {stage.benchmarkHeat !== undefined ? (
            <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums text-muted">
              {numFmt.format(stage.benchmarkHeat)}
              <span className="ml-1 text-base font-semibold">
                {t('monitoring.detail.specificPerArea')}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-base font-semibold text-foreground">
              {t('home.stage.noProfileYet')}
            </p>
          )}
          <p className="mt-1.5 text-sm text-muted">
            {stage.benchmarkHeat !== undefined
              ? t('home.stage.typicalNote')
              : t('home.stage.noProfileNote')}
          </p>
        </div>
      ) : (
        <div className={showBand ? 'mt-4' : ''}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t('home.stage.costKicker')}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-4xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {eurFmt.format(stage.totalCostEur)}
            </span>
            {stage.trend && <TrendBadge trend={stage.trend} compact />}
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {stage.level === 'fullYear'
              ? t('home.stage.basisFullYear')
              : t('home.stage.basisEstimate', { months: stage.estimateMonths ?? 1 })}
          </p>

          {/* Die Form des Jahres – die Belohnung für einen gepflegten Zähler. */}
          {stage.curve && (
            <div className="mt-3 -mx-4">
              <YearCurve
                values={stage.curve.values}
                color={ENERGY_META[stage.curve.type].accent}
                label={t('home.stage.curveAria', {
                  name: t(`monitoring.energyTypes.${stage.curve.type}`),
                })}
              />
            </div>
          )}

          {/* Aufschlüsselung: Oberkanten-Linien statt Kästchen. */}
          <div className="mt-4 flex gap-3">
            {stage.carriers.map((c) => (
              <button
                key={c.type}
                type="button"
                onClick={() => navigate(`/monitoring/${c.type}`)}
                className="focus-ring flex-1 border-t-2 border-foreground pt-1.5 text-left transition-opacity active:opacity-60"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: ENERGY_META[c.type as EnergyType].accent }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {t(`monitoring.energyTypes.${c.type}`)}
                  </span>
                </span>
                <span className="mt-0.5 block text-lg font-bold tabular-nums text-foreground">
                  {c.costEur !== undefined ? eurFmt.format(c.costEur) : '–'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Am ersten Tag greift der Fälligkeits-Hinweis nicht – es gibt ja noch
          keine letzte Ablesung. Dann lädt die Bühne selbst zum Eintrag ein,
          sonst hätte der wichtigste Zustand gar keine Handlung. */}
      {!stage.hasAnyReading ? (
        <button
          type="button"
          onClick={() => navigate('/monitoring')}
          className="focus-ring mt-4 flex w-full items-center justify-between gap-2 rounded-2xl bg-foreground px-4 py-3 text-left text-sm font-semibold text-background transition-transform active:scale-[0.99]"
        >
          {t('home.stage.firstReading')}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/monitoring')}
          className="focus-ring mt-4 flex w-full items-center gap-1 border-t border-border pt-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('home.stage.allMeters')}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}
