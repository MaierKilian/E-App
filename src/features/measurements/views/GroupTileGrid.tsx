import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Check, Ban, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementMeta } from '../catalog'
import type { MeasurementResult } from '../types'
import { RATING_COLOR } from '../rating'
import { instanceKey } from '../rooms'

/** Eine Messung innerhalb einer Gruppe, optional an einen konkreten Raum gebunden. */
export interface TileItem {
  meta: MeasurementMeta
  /** Raum-Schlüssel bei Pro-Raum-Messungen (sonst undefined). */
  roomKey?: string
}

export interface TileGroup {
  key: string
  label: string
  icon: LucideIcon
  /** Akzentfarbe als Hex-String (#rrggbb) – steuert Icon-Tint und aktiven Ring. */
  color?: string
  items: TileItem[]
}

/** Optionale „nichts zu messen"-Funktion (nur Raum-Ansicht). */
export interface SkipConfig {
  /** Keys der aktuell als übersprungen markierten Gruppen. */
  skipped: Set<string>
  /** Schaltet den Skip-Status einer Gruppe um. */
  onToggle: (key: string) => void
}

interface Props {
  groups: TileGroup[]
  results: Partial<Record<string, MeasurementResult>>
  /** Wenn gesetzt, erhalten Gruppen eine dezente „Nicht berücksichtigen"-Option. */
  skip?: SkipConfig
}

/** Kompakte Mess-Kachel mit Pfeil oben rechts, ohne „Messung starten"-Text. */
function MiniCard({
  meta,
  roomKey,
  result,
  color,
}: {
  meta: MeasurementMeta
  roomKey?: string
  result?: MeasurementResult
  color?: string
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const Icon = meta.icon
  const clickable = meta.available
  const href = roomKey
    ? `/measurements/${meta.id}?room=${encodeURIComponent(roomKey)}`
    : `/measurements/${meta.id}`
  const accent = color ?? '#6366f1'

  const value =
    result &&
    `${new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(result.primaryValue)} ${result.unit ?? ''}`.trim()

  const inner = (
    <>
      {/* Icon + Pfeil-Zeile */}
      <div className="flex items-center justify-between">
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${
            clickable ? '' : 'bg-surface-2 text-muted'
          }`}
          style={clickable ? { backgroundColor: `${accent}1f`, color: accent } : undefined}
        >
          <Icon className="h-4 w-4" />
        </span>
        {clickable && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
      </div>

      {/* Titel – bricht an Trennstrichen natürlich um */}
      <p className="mt-2 text-sm font-semibold leading-tight text-foreground">
        {t(`measurements.${meta.id}.title`)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        {meta.estimatedMinutes} {t('measurements.minutesUnit')}
      </p>

      <div className="mt-1.5">
        {result ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums"
            style={{ color: RATING_COLOR[result.rating] }}
          >
            <Check className="h-3 w-3" />
            {value}
          </span>
        ) : !clickable ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            {t('measurements.status.soon')}
          </span>
        ) : null}
      </div>
    </>
  )

  const base = 'glass snap-start shrink-0 w-32 rounded-2xl p-3 text-left'
  if (!clickable) return <div className={`${base} opacity-60`}>{inner}</div>
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className={`${base} transition-transform active:scale-[0.98]`}
    >
      {inner}
    </button>
  )
}

/**
 * Kachel-Grid für Gewerke-/Raum-Ansicht: Gruppen werden paarweise in 2-spaltigen
 * Zeilen gerendert. Klappt eine Gruppe auf, erscheint die Mess-Kachel-Reihe unterhalb
 * der gesamten Zeile – die Nachbar-Kachel bleibt an ihrer Position.
 */
export function GroupTileGrid({ groups, results, skip }: Props) {
  const { t } = useTranslation()
  const [active, setActive] = useState<string | null>(null)

  // Gruppen paarweise zu Zeilen zusammenfassen, damit beim Aufklappen einer Kachel
  // die Nachbarkachel nicht nach unten rutscht.
  const rows: TileGroup[][] = []
  for (let i = 0; i < groups.length; i += 2) {
    rows.push(groups.slice(i, i + 2))
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const activeGroup = row.find((g) => {
          const isSkipped = skip?.skipped.has(g.key) ?? false
          return active === g.key && !isSkipped
        })

        return (
          <Fragment key={row[0].key}>
            <div className="grid grid-cols-2 gap-3">
              {row.map((group) => {
                const done = group.items.filter(
                  (it) => results[instanceKey(it.meta.id, it.roomKey)],
                ).length
                const isSkipped = skip?.skipped.has(group.key) ?? false
                const isActive = active === group.key && !isSkipped
                const Icon = group.icon
                const accent = group.color ?? '#6366f1'

                return (
                  <div key={group.key} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => !isSkipped && setActive(isActive ? null : group.key)}
                      aria-expanded={isActive}
                      disabled={isSkipped}
                      className={`glass flex flex-1 flex-col gap-3 rounded-3xl p-4 text-left transition-[transform,opacity] active:scale-[0.99] ${
                        isSkipped ? 'opacity-50' : ''
                      }`}
                      style={
                        isActive
                          ? { outline: `2px solid ${accent}80`, outlineOffset: '2px' }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`grid h-11 w-11 place-items-center rounded-2xl ${
                            isSkipped ? 'bg-surface-2 text-muted' : ''
                          }`}
                          style={
                            !isSkipped
                              ? { backgroundColor: `${accent}1a`, color: accent }
                              : undefined
                          }
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        {!isSkipped && (
                          <ChevronDown
                            className={`h-4 w-4 text-muted transition-transform ${isActive ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold leading-tight text-foreground">{group.label}</p>
                        <p className="mt-0.5 text-sm tabular-nums text-muted">
                          {isSkipped
                            ? t('measurements.byRoom.nothingToMeasure')
                            : `${done}/${group.items.length}`}
                        </p>
                      </div>
                    </button>

                    {skip && (
                      <button
                        type="button"
                        onClick={() => skip.onToggle(group.key)}
                        className="focus-ring inline-flex items-center justify-center gap-1 self-center rounded-full px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                      >
                        {isSkipped ? (
                          <>
                            <RotateCcw className="h-3 w-3" />
                            {t('measurements.byRoom.undo')}
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3" />
                            {t('measurements.byRoom.markNothing')}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Aufgeklappte MiniCards unterhalb der gesamten Zeile.
                pb-7 gibt dem backdrop-filter blur genug Luft, damit die
                overflow-Clipping-Kante nicht sichtbar wird. */}
            {activeGroup && (
              <div className="flex gap-3 overflow-x-auto px-1 pt-1 pb-7 snap-x">
                {activeGroup.items.map((it) => (
                  <MiniCard
                    key={instanceKey(it.meta.id, it.roomKey)}
                    meta={it.meta}
                    roomKey={it.roomKey}
                    result={results[instanceKey(it.meta.id, it.roomKey)]}
                    color={activeGroup.color}
                  />
                ))}
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
