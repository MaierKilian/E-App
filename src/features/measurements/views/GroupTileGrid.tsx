import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementMeta } from '../catalog'
import type { MeasurementResult } from '../types'
import { RATING_COLOR } from '../rating'

export interface TileGroup {
  key: string
  label: string
  icon: LucideIcon
  items: MeasurementMeta[]
}

interface Props {
  groups: TileGroup[]
  results: Partial<Record<string, MeasurementResult>>
}

/** Kleine, horizontal scrollbare Messungs-Kachel innerhalb einer aufgeklappten Gruppe. */
function MiniCard({ meta, result }: { meta: MeasurementMeta; result?: MeasurementResult }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const Icon = meta.icon
  const clickable = meta.available

  const value =
    result &&
    `${new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(result.primaryValue)} ${result.unit ?? ''}`.trim()

  const inner = (
    <>
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${
          clickable ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-foreground">
        {t(`measurements.${meta.id}.title`)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        {meta.estimatedMinutes} {t('measurements.minutesUnit')}
      </p>
      <div className="mt-2">
        {result ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums"
            style={{ color: RATING_COLOR[result.rating] }}
          >
            <Check className="h-3 w-3" />
            {value}
          </span>
        ) : clickable ? (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            {t('measurements.next.start')}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            {t('measurements.status.soon')}
          </span>
        )}
      </div>
    </>
  )

  const base = 'glass snap-start shrink-0 w-40 rounded-2xl p-3 text-left'
  if (!clickable) return <div className={`${base} opacity-60`}>{inner}</div>
  return (
    <button
      type="button"
      onClick={() => navigate(`/measurements/${meta.id}`)}
      className={`${base} transition-transform active:scale-[0.98]`}
    >
      {inner}
    </button>
  )
}

/**
 * Kachel-Grid für Gewerke-/Raum-Ansicht: 2-spaltige Gruppen-Kacheln; beim Antippen
 * klappt darunter eine horizontal scrollbare Reihe der einzelnen Mess-Kacheln auf.
 */
export function GroupTileGrid({ groups, results }: Props) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-2 gap-3">
      {groups.map((group) => {
        const done = group.items.filter((m) => results[m.id]).length
        const isActive = active === group.key
        const Icon = group.icon
        return (
          <Fragment key={group.key}>
            <button
              type="button"
              onClick={() => setActive(isActive ? null : group.key)}
              aria-expanded={isActive}
              className={`glass flex flex-col gap-3 rounded-3xl p-4 text-left transition-[transform] active:scale-[0.99] ${
                isActive ? 'ring-2 ring-primary/60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition-transform ${isActive ? 'rotate-180' : ''}`}
                />
              </div>
              <div>
                <p className="font-semibold leading-tight text-foreground">{group.label}</p>
                <p className="mt-0.5 text-sm tabular-nums text-muted">
                  {done}/{group.items.length}
                </p>
              </div>
            </button>

            {isActive && (
              <div className="col-span-2">
                <div className="flex gap-3 overflow-x-auto px-0.5 pb-1 snap-x">
                  {group.items.map((meta) => (
                    <MiniCard key={meta.id} meta={meta} result={results[meta.id]} />
                  ))}
                </div>
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
