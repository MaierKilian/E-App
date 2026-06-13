import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Check, Sparkles, TrendingDown } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { InfoButton } from '@/components/ui/InfoButton'
import { MEASUREMENT_CATALOG } from '../catalog'
import type { MeasurementMeta } from '../catalog'
import type { MeasurementResult } from '../types'
import { impactSummary } from '../impact'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

/** Hero-Karte mit aggregiertem Einsparpotenzial (€ und CO₂-Schätzung). */
function ImpactCard({ results }: ViewProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const { savingsEur, co2Kg, contributing } = impactSummary(results, workPriceCt)

  if (savingsEur <= 0) return null

  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-500 opacity-[0.14] blur-3xl"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingDown className="h-3.5 w-3.5" />
          {t('measurements.impact.title')}
        </span>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {eurFmt.format(savingsEur)}
          </span>
          <span className="text-base font-medium text-muted">
            {t('measurements.impact.perYear')}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          {t('measurements.impact.co2', { value: eurFmt.format(co2Kg) })}
          <InfoButton text={t('measurements.impact.info')} />
        </p>
        <p className="mt-2 text-xs text-muted">
          {t('measurements.impact.from', { count: contributing })}
        </p>
      </div>
    </div>
  )
}

/** Hero-Karte „Als Nächstes" für die nächste offene, verfügbare Messung. */
function NextCard({ meta }: { meta: MeasurementMeta }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const Icon = meta.icon
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  return (
    <div className="glass rounded-3xl p-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {t('measurements.next.badge')}
      </span>

      <div className="mt-3 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground">{t(`measurements.${meta.id}.title`)}</p>
          <p className="mt-0.5 text-sm text-muted">{metaLine}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">{t(`measurements.${meta.id}.short`)}</p>

      <button
        type="button"
        onClick={() => navigate(`/measurements/${meta.id}`)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
      >
        {t('measurements.next.start')}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Kompakte, nummerierte Zeile der „Weitere Schritte"-Liste. */
function MoreRow({
  index,
  meta,
  result,
}: {
  index: number
  meta: MeasurementMeta
  result?: MeasurementResult
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const done = Boolean(result)
  const clickable = meta.available
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const content = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{t(`measurements.${meta.id}.title`)}</p>
        <p className="truncate text-sm text-muted">{metaLine}</p>
      </div>
      {done ? (
        <Check className="h-5 w-5 shrink-0 text-primary" />
      ) : clickable ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      ) : (
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
          {t('measurements.status.soon')}
        </span>
      )}
    </>
  )

  const base = 'glass flex w-full items-center gap-3 rounded-2xl p-3 text-left'
  if (!clickable) return <div className={`${base} opacity-60`}>{content}</div>
  return (
    <button
      type="button"
      onClick={() => navigate(`/measurements/${meta.id}`)}
      className={`${base} transition-transform active:scale-[0.99]`}
    >
      {content}
    </button>
  )
}

/**
 * Empfohlene Ansicht: Messprofil-Fortschritt, „Als Nächstes"-Hero und eine
 * nummerierte Liste der übrigen Messungen.
 */
export function RecommendedView({ results }: ViewProps) {
  const { t } = useTranslation()

  const available = MEASUREMENT_CATALOG.filter((m) => m.available)
  const done = available.filter((m) => results[m.id]).length
  const total = available.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const next = available.find((m) => !results[m.id])
  const rest = MEASUREMENT_CATALOG.filter((m) => m.id !== next?.id)

  return (
    <div className="space-y-5">
      <ImpactCard results={results} />

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-foreground">{t('measurements.profile.title')}</p>
          <span className="text-sm font-semibold tabular-nums text-muted">
            {t('measurements.profile.progress', { done, total })}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {next ? (
        <NextCard meta={next} />
      ) : (
        <div className="glass flex items-center gap-3 rounded-3xl p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Check className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">{t('measurements.allDone')}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('measurements.more')}
          </h2>
          <div className="space-y-2">
            {rest.map((meta, i) => (
              <MoreRow key={meta.id} index={i + 1} meta={meta} result={results[meta.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
