import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Check, Sparkles, RotateCcw } from 'lucide-react'
import type { MeasurementResult } from '../types'
import { RATING_COLOR } from '../rating'
import { taskHref, type MeasurementTask } from '../tasks'

interface Props {
  tasks: MeasurementTask[]
  results: Partial<Record<string, MeasurementResult>>
}

/**
 * „Messung für Messung"-Karussell: eine große Karte je Aufgabe, horizontal
 * wisch- und durchklickbar (Pfeile + Punkte). Startet bei der nächsten offenen
 * Messung. Passt ohne Scrollen auf einen Screen.
 */
export function MeasurementCarousel({ tasks, results }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstUndone = tasks.findIndex((tk) => tk.meta.available && !results[tk.key])
  const startIndex = firstUndone === -1 ? 0 : firstUndone
  const [active, setActive] = useState(startIndex)

  // Beim ersten Rendern direkt zur nächsten offenen Messung springen.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ left: startIndex * el.clientWidth, behavior: 'auto' })
    // Nur einmal initial ausrichten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goTo(i: number) {
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(tasks.length - 1, i))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
    setActive(clamped)
  }

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== active) setActive(i)
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {tasks.map((task, i) => (
          <div key={task.key} className="w-full shrink-0 snap-center">
            <Card task={task} result={results[task.key]} recommended={i === startIndex} />
          </div>
        ))}
      </div>

      {/* Navigation: Pfeile + Punkte */}
      <div className="flex items-center justify-center gap-4">
        <NavArrow dir="prev" onClick={() => goTo(active - 1)} disabled={active === 0} />
        <div className="flex items-center gap-1.5">
          {tasks.map((task, i) => (
            <button
              key={task.key}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-primary' : 'w-1.5 bg-surface-2'
              }`}
            />
          ))}
        </div>
        <NavArrow dir="next" onClick={() => goTo(active + 1)} disabled={active === tasks.length - 1} />
      </div>
    </div>
  )
}

function NavArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir}
      className="glass grid h-9 w-9 place-items-center rounded-full text-foreground transition-opacity disabled:opacity-30"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function Card({
  task,
  result,
  recommended,
}: {
  task: MeasurementTask
  result?: MeasurementResult
  recommended: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { meta, roomName } = task
  const Icon = meta.icon
  const done = Boolean(result)
  const clickable = meta.available
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const value =
    result &&
    `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(result.primaryValue)} ${result.unit ?? ''}`.trim()

  return (
    <div className="glass mx-0.5 flex min-h-[19rem] flex-col rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        {done ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              color: RATING_COLOR[result!.rating],
              backgroundColor: `color-mix(in srgb, ${RATING_COLOR[result!.rating]} 14%, transparent)`,
            }}
          >
            <Check className="h-3.5 w-3.5" />
            {value}
          </span>
        ) : recommended && clickable ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('measurements.next.badge')}
          </span>
        ) : !clickable ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
            {t('measurements.status.soon')}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-xl font-bold leading-tight text-foreground">
        {t(`measurements.${meta.id}.title`)}
        {roomName && <span className="text-muted"> · {roomName}</span>}
      </h3>
      <p className="mt-1 text-sm text-muted">{metaLine}</p>
      <p className="mt-3 line-clamp-3 text-sm text-foreground">
        {t(`measurements.${meta.id}.short`)}
      </p>

      <div className="mt-auto pt-5">
        {clickable ? (
          <button
            type="button"
            onClick={() => navigate(taskHref(task))}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
          >
            {done ? (
              <>
                <RotateCcw className="h-4 w-4" />
                {t('measurements.common.again')}
              </>
            ) : (
              <>
                {t('measurements.next.start')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <div className="rounded-2xl bg-surface-2/60 px-5 py-3 text-center text-sm font-medium text-muted">
            {t('measurements.status.soon')}
          </div>
        )}
      </div>
    </div>
  )
}
