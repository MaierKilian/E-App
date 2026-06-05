import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Check } from 'lucide-react'
import type { MeasurementMeta } from './catalog'
import type { MeasurementResult } from './types'

/** Kleiner Schwierigkeits-Indikator als 1–3 Punkte. */
function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= level ? 'bg-primary' : 'bg-surface-2'}`}
        />
      ))}
    </span>
  )
}

interface RowProps {
  meta: MeasurementMeta
  result?: MeasurementResult
}

/**
 * Wiederverwendbare Mess-Zeile (Icon, Titel, „Gewerk · X Min", Schwierigkeit,
 * Status-Badge erledigt/Wert/bald, Chevron). Anklickbar nur, wenn verfügbar.
 */
export function MeasurementRow({ meta, result }: RowProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const Icon = meta.icon
  const done = Boolean(result)
  const clickable = meta.available

  const valueText =
    result &&
    `${new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(result.primaryValue)} ${t('measurements.showerhead.result.flowUnit')}`

  const ratingClass =
    result?.rating === 'good'
      ? 'text-primary'
      : result?.rating === 'high'
        ? 'text-foreground'
        : 'text-muted'

  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const content = (
    <>
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          clickable ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{t(`measurements.${meta.id}.title`)}</p>
        <p className="mt-0.5 truncate text-sm text-muted">{metaLine}</p>
        <div className="mt-2 flex items-center gap-2">
          <Difficulty level={meta.difficulty} />
          <span className="text-[11px] text-muted">{t('measurements.difficultyLabel')}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 self-center">
        {done ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <Check className="h-3.5 w-3.5" />
              {t('measurements.status.done')}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${ratingClass}`}>{valueText}</span>
          </>
        ) : clickable ? (
          <ChevronRight className="h-5 w-5 text-muted" />
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            {t('measurements.status.soon')}
          </span>
        )}
      </div>
    </>
  )

  const base = 'glass flex w-full items-start gap-3 rounded-3xl p-4 text-left'

  if (!clickable) {
    return <div className={`${base} opacity-60`}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/measurements/${meta.id}`)}
      className={`${base} transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-[0.99]`}
    >
      {content}
    </button>
  )
}
