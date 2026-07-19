import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, AppWindow, Flame, Building2, Layers, Ban, TrendingDown, ArrowUpRight, Gauge, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { estimateEnvelope } from '@/features/home/estimateEnergy'
import type { OnboardingData, RenovationYear, RenovationItem } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const RENOVATION_YEARS: RenovationYear[] = [
  'never',
  'before_2000',
  '2000_2010',
  '2010_2020',
  'after_2020',
  'unknown',
]

const RENOVATION_ITEMS: RenovationItem[] = [
  'roof_insulation',
  'windows',
  'heating_system',
  'facade',
  'basement_ceiling',
  'nothing',
]
const ITEM_ICONS: Record<RenovationItem, LucideIcon> = {
  roof_insulation: Home,
  windows: AppWindow,
  heating_system: Flame,
  facade: Building2,
  basement_ceiling: Layers,
  nothing: Ban,
}

export function Step7Renovation({ data, onChange }: Props) {
  const { t } = useTranslation()

  function toggleRenovationItem(item: RenovationItem) {
    const current = data.renovationItems
    if (item === 'nothing') {
      onChange({ renovationItems: current.includes('nothing') ? [] : ['nothing'] })
      return
    }
    const withoutNothing = current.filter((i) => i !== 'nothing')
    if (withoutNothing.includes(item)) {
      onChange({ renovationItems: withoutNothing.filter((i) => i !== item) })
    } else {
      onChange({ renovationItems: [...withoutNothing, item] })
    }
  }

  return (
    <div className="space-y-6">
      <Field title={t('onboarding.step7renovation.lastRenovationYear')} info={t('info.renovation')}>
        <div className="flex flex-wrap gap-2">
          {RENOVATION_YEARS.map((year) => (
            <OptionChip
              key={year}
              label={t(`onboarding.step7renovation.renovationYearOptions.${year}`)}
              selected={data.lastRenovationYear === year}
              onClick={() =>
                onChange(
                  year === 'never'
                    ? { lastRenovationYear: year, renovationItems: [] }
                    : { lastRenovationYear: year },
                )
              }
            />
          ))}
        </div>
      </Field>

      {data.lastRenovationYear !== 'never' && (
        <Field
          title={t('onboarding.step7renovation.renovationItems')}
          hint={t('onboarding.step7renovation.itemsHint')}
        >
          <div className="flex flex-wrap gap-2">
            {RENOVATION_ITEMS.map((item) => (
              <OptionChip
                key={item}
                icon={ITEM_ICONS[item]}
                label={t(`onboarding.step7renovation.renovationItemOptions.${item}`)}
                selected={data.renovationItems.includes(item)}
                onClick={() => toggleRenovationItem(item)}
              />
            ))}
          </div>
        </Field>
      )}

      <EfficiencyEstimate data={data} />
    </div>
  )
}

/**
 * Qualitative Hüllen-Einordnung (Baustein 1). Zeigt bewusst KEINE absolute Zahl
 * oder Energieausweis-Klasse, sondern eine grobe Skala, die relative Wirkung der
 * Sanierungen und den größten offenen Hebel – plus ehrliche Rahmung und den
 * Verweis auf echte Zählerstände. Siehe docs/renovation-redesign.md.
 */
function EfficiencyEstimate({ data }: { data: OnboardingData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const est = estimateEnvelope(data)

  return (
    <div className="glass rounded-3xl p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Gauge className="h-3.5 w-3.5" />
        {t('onboarding.step7renovation.estimate.title')}
      </p>

      {/* Grobe Skala mit Marker – nur wenn das Baujahr eine Basis liefert. */}
      {est.position !== null ? (
        <div className="mt-3">
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500">
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground shadow"
              style={{ left: `${est.position * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{t('onboarding.step7renovation.estimate.scaleEfficient')}</span>
            <span>{t('onboarding.step7renovation.estimate.scaleNeedy')}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {t('onboarding.step7renovation.estimate.needYear')}
        </p>
      )}

      {/* Relative Wirkung der Sanierungen. */}
      <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {est.savingsPct > 0 ? (
          <>
            <TrendingDown className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {t('onboarding.step7renovation.estimate.savings', { pct: est.savingsPct })}
          </>
        ) : (
          <span className="text-muted">
            {t('onboarding.step7renovation.estimate.noSavings')}
          </span>
        )}
      </p>

      {/* Größter Hebel bzw. „rundum saniert". */}
      {est.nextLever ? (
        <div className="mt-3 rounded-2xl bg-surface-2/50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
            {t('onboarding.step7renovation.estimate.nextLever', {
              item: t(`onboarding.step7renovation.renovationItemOptions.${est.nextLever}`),
              pct: est.nextLeverPct,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('onboarding.step7renovation.estimate.funding')}
          </p>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {t('onboarding.step7renovation.estimate.allDone')}
        </p>
      )}

      {/* Ehrliche Rahmung + Verzahnung mit echten Verbrauchsdaten. */}
      <p className="mt-3 text-xs text-muted">
        {t('onboarding.step7renovation.estimate.disclaimer')}
      </p>
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-primary transition-colors hover:underline"
      >
        {t('onboarding.step7renovation.estimate.toMeter')}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
