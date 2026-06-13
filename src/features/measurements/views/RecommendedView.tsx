import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Check, Sparkles, TrendingDown } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { InfoButton } from '@/components/ui/InfoButton'
import { MEASUREMENT_CATALOG } from '../catalog'
import type { MeasurementMeta } from '../catalog'
import type { MeasurementResult } from '../types'
import { impactSummary } from '../impact'
import { roomInstances, roomLabel, instanceKey } from '../rooms'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

/** Eine konkrete Mess-Aufgabe: Messung + optional Raum. */
interface Task {
  meta: MeasurementMeta
  roomKey?: string
  /** Anzeigename des Raums (nur bei Pro-Raum-Aufgaben). */
  roomName?: string
  /** Ergebnis-Schlüssel im Store. */
  key: string
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

/** Pfad zum Runner für eine Aufgabe (inkl. Raum, falls vorhanden). */
function taskHref(task: Task): string {
  return task.roomKey
    ? `/measurements/${task.meta.id}?room=${encodeURIComponent(task.roomKey)}`
    : `/measurements/${task.meta.id}`
}

/** Hero-Karte „Als Nächstes" für die nächste offene Aufgabe. */
function NextCard({ task }: { task: Task }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta, roomName } = task
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
          <p className="text-lg font-bold text-foreground">
            {t(`measurements.${meta.id}.title`)}
            {roomName && <span className="text-muted"> · {roomName}</span>}
          </p>
          <p className="mt-0.5 text-sm text-muted">{metaLine}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">{t(`measurements.${meta.id}.short`)}</p>

      <button
        type="button"
        onClick={() => navigate(taskHref(task))}
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
  task,
  result,
}: {
  index: number
  task: Task
  result?: MeasurementResult
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta, roomName } = task
  const done = Boolean(result)
  const clickable = meta.available
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const content = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">
          {t(`measurements.${meta.id}.title`)}
          {roomName && <span className="text-muted"> · {roomName}</span>}
        </p>
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
      onClick={() => navigate(taskHref(task))}
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
  const rooms = useOnboardingStore((s) => s.data.rooms)

  // Aufgaben in Katalog-Reihenfolge; Pro-Raum-Messungen werden je Raum expandiert
  // (dadurch „Raum für Raum" hintereinander in der geführten Reihenfolge).
  const instances = roomInstances(rooms)
  const tasks: Task[] = []
  for (const meta of MEASUREMENT_CATALOG) {
    if (meta.perRoom) {
      for (const inst of instances) {
        tasks.push({
          meta,
          roomKey: inst.key,
          roomName: roomLabel(t, inst),
          key: instanceKey(meta.id, inst.key),
        })
      }
    } else {
      tasks.push({ meta, key: instanceKey(meta.id) })
    }
  }

  const availableTasks = tasks.filter((tk) => tk.meta.available)
  const done = availableTasks.filter((tk) => results[tk.key]).length
  const total = availableTasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const next = availableTasks.find((tk) => !results[tk.key])
  const rest = tasks.filter((tk) => tk.key !== next?.key)

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
        <NextCard task={next} />
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
            {rest.map((task, i) => (
              <MoreRow key={task.key} index={i + 1} task={task} result={results[task.key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
