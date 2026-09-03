import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { ENERGY_META } from './energyConfig'
import { sortByDate, consumptionTrend, daysSinceLastReading } from './readings'
import { counterSeries, meterMode } from './counterSeries'
import { isRefillDue, meterRange } from './range'
import { isSeasonal } from './energyConfig'
import { toPercent } from './fillLevel'
import { Sparkline } from './Sparkline'
import { TrendBadge } from './MeterTrend'
import { useLastReadingText } from './useLastReadingText'

/**
 * Beispiel-Verlauf (monoton steigende Zählerstände) für die Ghost-Vorschau im
 * Leerzustand – rein illustrativ, klar als „Beispiel" gekennzeichnet.
 */
const EXAMPLE_SERIES = [100, 128, 151, 179, 206, 234]

/** Wie lange (ms) gedrückt gehalten werden muss, bis ein Widget „andockt". */
const LONG_PRESS_MS = 400
/** Bewegt sich der Finger vorher weiter als das, gilt es als Scrollen (kein Drag). */
const MOVE_CANCEL_PX = 10

/** Rechteck in Dokument-Koordinaten (scroll-unabhängig) – stabil während des Drags. */
interface PageRect {
  left: number
  top: number
  right: number
  bottom: number
}

interface DragState {
  type: EnergyType
  pointerId: number
  /** Größe des aufgenommenen Widgets (für den schwebenden Klon). */
  size: { w: number; h: number }
  /** Position des Fingers innerhalb des Widgets (Viewport-relativ, konstant). */
  grab: { dx: number; dy: number }
  /** Aktuelle Fingerposition (Viewport-Koordinaten). */
  x: number
  y: number
  /** Zielposition in der aktuellen Reihenfolge. */
  hoverIndex: number
}

interface WidgetBoardProps {
  /** Reihenfolge der Widgets; Position 0 wird groß dargestellt. */
  order: EnergyType[]
  due: Set<EnergyType>
  now: number
  /** Neue Reihenfolge nach dem Ablegen. */
  onReorder: (next: EnergyType[]) => void
  /** „Zählerstand eintragen" für das große Hero-Widget. */
  onAdd: (type: EnergyType) => void
}

/** Verschiebt ein Element von `from` nach `to` (reine Funktion). */
function move(arr: EnergyType[], from: number, to: number): EnergyType[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function vibrate(ms: number) {
  const nav = navigator as Navigator & { vibrate?: (pattern: number) => void }
  nav.vibrate?.(ms)
}

/**
 * Anordenbares Widget-Board der Monitoring-Übersicht.
 *
 * Bedienung: Ein Widget ~0,4 s gedrückt halten „hebt" es an (haptisches
 * Feedback); in derselben Bewegung an die Zielposition ziehen und loslassen.
 * Zieht man ein kleines Widget nach ganz oben auf das große, wird es zum neuen
 * großen Widget und das bisherige große rückt als erstes kleines nach – die
 * übrigen verschieben sich entsprechend (Position 0 ist immer groß).
 *
 * Umsetzung bewusst ohne DnD-Bibliothek: Pointer-Events + `setPointerCapture`.
 * Während des Drags bleibt das Layout stehen (das aufgenommene Widget wird zum
 * gedämpften Platzhalter), sodass die zu Beginn erfassten Slot-Rechtecke stabil
 * bleiben; das Ziel wird per Nächster-Mittelpunkt-Treffer bestimmt und optisch
 * hervorgehoben. Ein normaler Tipp öffnet weiterhin die Detailseite.
 */
export function WidgetBoard({ order, due, now, onReorder, onAdd }: WidgetBoardProps) {
  const [drag, setDrag] = useState<DragState | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const orderRef = useRef(order)
  const slotRects = useRef(new Map<EnergyType, PageRect>())
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPt = useRef<{ x: number; y: number } | null>(null)
  const didDrag = useRef(false)

  // Reihenfolge in einem Ref spiegeln, damit die (delegierten) Pointer-Handler
  // stets den neuesten Stand sehen – ohne Ref-Zugriff während des Renderns.
  useEffect(() => {
    orderRef.current = order
  }, [order])

  // Long-Press-Erkennung + Aufnehmen, per Event-Delegation am Board. Die gesamte
  // imperative Logik liegt in Effekten (dort ist Ref-Zugriff erlaubt); die Slots
  // im JSX tragen nur `data-widget-type` und Zustandsklassen.
  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    function clearPress() {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
        pressTimer.current = null
      }
      startPt.current = null
    }

    function slotTypeFrom(target: EventTarget | null): EnergyType | null {
      const el = (target as HTMLElement | null)?.closest('[data-widget-type]')
      return (el?.getAttribute('data-widget-type') as EnergyType | null) ?? null
    }

    function activate(type: EnergyType, pointerId: number, clientX: number, clientY: number) {
      // Slot-Rechtecke einmalig in Dokument-Koordinaten erfassen (bleiben stabil,
      // da das Layout während des Drags nicht umbricht).
      const rects = new Map<EnergyType, PageRect>()
      let draggedRect: DOMRect | null = null
      board!.querySelectorAll<HTMLElement>('[data-widget-type]').forEach((node) => {
        const t = node.getAttribute('data-widget-type') as EnergyType
        const r = node.getBoundingClientRect()
        rects.set(t, {
          left: r.left + window.scrollX,
          top: r.top + window.scrollY,
          right: r.right + window.scrollX,
          bottom: r.bottom + window.scrollY,
        })
        if (t === type) draggedRect = r
      })
      if (!draggedRect) return
      slotRects.current = rects
      const vr: DOMRect = draggedRect
      try {
        board!.setPointerCapture(pointerId)
      } catch {
        // Pointer evtl. bereits weg – unkritisch.
      }
      vibrate(10)
      didDrag.current = true
      const next: DragState = {
        type,
        pointerId,
        size: { w: vr.width, h: vr.height },
        grab: { dx: clientX - vr.left, dy: clientY - vr.top },
        x: clientX,
        y: clientY,
        hoverIndex: orderRef.current.indexOf(type),
      }
      dragRef.current = next
      setDrag(next)
    }

    function onDown(e: PointerEvent) {
      if (orderRef.current.length < 2) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const type = slotTypeFrom(e.target)
      if (!type) return
      didDrag.current = false
      clearPress()
      startPt.current = { x: e.clientX, y: e.clientY }
      const { pointerId, clientX, clientY } = e
      pressTimer.current = setTimeout(() => {
        pressTimer.current = null
        activate(type, pointerId, clientX, clientY)
      }, LONG_PRESS_MS)
    }

    // Vor dem Aufnehmen: bewegt sich der Finger, war es Scrollen/Wischen → abbrechen.
    function onMovePre(e: PointerEvent) {
      if (dragRef.current || !startPt.current) return
      const dx = e.clientX - startPt.current.x
      const dy = e.clientY - startPt.current.y
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearPress()
    }

    function onUpPre() {
      // Kein Drag ausgelöst → Timer verwerfen (normaler Tipp öffnet die Detailseite).
      if (!dragRef.current) clearPress()
    }

    // Klick direkt nach einem Drag schlucken (sonst öffnet der innere Button die Seite).
    function onClickCapture(e: MouseEvent) {
      if (didDrag.current) {
        e.preventDefault()
        e.stopPropagation()
        didDrag.current = false
      }
    }

    board.addEventListener('pointerdown', onDown)
    board.addEventListener('pointermove', onMovePre)
    board.addEventListener('pointerup', onUpPre)
    board.addEventListener('pointerleave', onUpPre)
    board.addEventListener('click', onClickCapture, true)
    return () => {
      clearPress()
      board.removeEventListener('pointerdown', onDown)
      board.removeEventListener('pointermove', onMovePre)
      board.removeEventListener('pointerup', onUpPre)
      board.removeEventListener('pointerleave', onUpPre)
      board.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  // Bewegung/Loslassen, solange ein Widget schwebt (window, damit es auch außerhalb
  // des Boards weiterläuft). Läuft pro Drag-Session – nicht bei jeder Bewegung neu.
  useEffect(() => {
    if (!drag) return

    /** Zielposition: Slot, dessen Mittelpunkt dem Finger am nächsten liegt. */
    function hitTest(px: number, py: number): number {
      let best = dragRef.current ? orderRef.current.indexOf(dragRef.current.type) : 0
      let bestDist = Infinity
      orderRef.current.forEach((type, i) => {
        const r = slotRects.current.get(type)
        if (!r) return
        const cx = (r.left + r.right) / 2
        const cy = (r.top + r.bottom) / 2
        const d = Math.hypot(px - cx, py - cy)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      return best
    }

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      e.preventDefault()
      const hoverIndex = hitTest(e.clientX + window.scrollX, e.clientY + window.scrollY)
      const next = { ...d, x: e.clientX, y: e.clientY, hoverIndex }
      dragRef.current = next
      setDrag(next)

      // Sanftes Auto-Scrollen am oberen/unteren Rand.
      const margin = 72
      if (e.clientY < margin) window.scrollBy(0, -14)
      else if (e.clientY > window.innerHeight - margin) window.scrollBy(0, 14)
    }

    function finish(e: PointerEvent, apply: boolean) {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      if (apply) {
        const from = orderRef.current.indexOf(d.type)
        if (from !== -1 && d.hoverIndex !== -1 && from !== d.hoverIndex) {
          onReorder(move(orderRef.current, from, d.hoverIndex))
        }
      }
      dragRef.current = null
      setDrag(null)
    }

    const onUp = (e: PointerEvent) => finish(e, true)
    const onCancel = (e: PointerEvent) => finish(e, false)

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    // Absichtlich nur an der Drag-Session (an/aus) hängen, nicht an jeder Bewegung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null])

  const [hero, ...rest] = order
  const dragging = drag?.type ?? null
  const targetType = drag ? order[drag.hoverIndex] : null

  /** Zustandsklassen eines Slots (nur aus State abgeleitet – kein Ref-Zugriff). */
  function slotClass(type: EnergyType): string {
    const isTarget = drag != null && targetType === type && dragging !== type
    return `relative rounded-3xl transition-shadow${
      isTarget ? ' ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
    }`
  }

  return (
    <>
      <div
        ref={boardRef}
        className="space-y-5"
        style={{ touchAction: drag ? 'none' : undefined }}
      >
        {hero && (
          <div
            data-widget-type={hero}
            className={slotClass(hero)}
            style={{ opacity: dragging === hero ? 0.35 : undefined }}
          >
            <HeroMeter type={hero} due={due.has(hero)} now={now} onAdd={() => onAdd(hero)} />
          </div>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {rest.map((type) => (
              <div
                key={type}
                data-widget-type={type}
                className={slotClass(type)}
                style={{ opacity: dragging === type ? 0.35 : undefined }}
              >
                <MeterTile type={type} due={due.has(type)} now={now} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schwebender Klon, folgt dem Finger. */}
      {drag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-3xl shadow-2xl"
          style={{
            left: drag.x - drag.grab.dx,
            top: drag.y - drag.grab.dy,
            width: drag.size.w,
            height: drag.size.h,
            transform: 'scale(1.03)',
          }}
        >
          {drag.type === hero ? (
            <HeroMeter type={drag.type} due={due.has(drag.type)} now={now} onAdd={() => {}} />
          ) : (
            <MeterTile type={drag.type} due={due.has(drag.type)} now={now} />
          )}
        </div>
      )}
    </>
  )
}

interface MeterProps {
  type: EnergyType
  due: boolean
  now: number
}

/** Große Hero-Karte des wichtigsten Zählers: Stand, Verlaufskurve, Trend. */
function HeroMeter({ type, due, now, onAdd }: MeterProps & { onAdd: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)
  const meterConfig = useReadingsStore((s) => s.meters[type])

  const meta = ENERGY_META[type]
  const isLevel = meterMode(meterConfig) === 'level'
  const Icon = meta.icon
  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings[readings.length - 1]
  // Gleiche Datengrundlage wie das Detail-Diagramm (absoluter Zählerstand),
  // damit Mini- und Detailkurve übereinstimmen. Bei einem Vorrat ist das die
  // fallende Kurve mit den Sprüngen der Lieferungen – der Trend darunter
  // rechnet dagegen auf der virtuellen Zählerreihe.
  const series = readings.map((r) => r.value)
  const dates = readings.map((r) => r.date)
  const trend = consumptionTrend(counterSeries(readings, meterConfig))
  const range = meterRange(readings, meterConfig, { seasonal: isSeasonal(type) })
  const days = daysSinceLastReading(readings, now)
  const lastText = useLastReadingText(days)

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  // „reicht bis ~14. Februar" – Tag und Monat genügen; das Jahr wäre bei einer
  // Schätzung über wenige Monate nur Ballast.
  const rangeFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' })
  const rangeText = range
    ? t('monitoring.tank.rangeUntil', {
        date: rangeFmt.format(new Date(`${range.emptyDate}T00:00:00`)),
      })
    : null
  const go = () => navigate(`/monitoring/${type}`)

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5">
      {/* Akzent-Schimmer in der Typ-Farbe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: meta.accent, opacity: 0.16 }}
      />
      <div className="relative">
        {/* Antippen öffnet die Detailseite (Diagramm & Historie). */}
        <button type="button" onClick={go} className="block w-full text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
                style={{ background: `${meta.accent}1f`, color: meta.accent }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {t(`monitoring.energyTypes.${type}`)}
                </p>
                {/* Beim Vorrat zählt, wie lange er noch reicht – nicht, wann
                    zuletzt abgelesen wurde. */}
                {rangeText ? (
                  <p className="text-xs text-muted">{rangeText}</p>
                ) : (
                  lastText && <p className="text-xs text-muted">{lastText}</p>
                )}
              </div>
            </div>
            {due ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shrink-0">
                {/* Bei einem knappen Vorrat ist „fällig" die falsche Ansage:
                    Abgelesen ist längst, bestellt werden muss. */}
                {isRefillDue(range) ? t('monitoring.tank.refillDue') : t('monitoring.reminder.due')}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted">
                {isLevel ? t('monitoring.tank.currentLevel') : t('monitoring.detail.current')}
              </p>
              {latest ? (
                isLevel ? (
                  <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                    {Math.round(toPercent(latest.value, meterConfig?.capacity))}
                    <span className="ml-1 text-base font-medium text-muted">%</span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                    {numFmt.format(latest.value)}
                    <span className="ml-1 text-base font-medium text-muted">{meta.unit}</span>
                  </p>
                )
              ) : (
                <p className="mt-0.5 text-base text-muted">{t('monitoring.overview.empty')}</p>
              )}
            </div>
            {trend && <TrendBadge trend={trend} />}
          </div>

          <div className="mt-4">
            {series.length >= 2 ? (
              <Sparkline values={series} dates={dates} color={meta.accent} height={48} />
            ) : (
              // Ghost-Vorschau: dezente Beispiel-Kurve zeigt, wie der Verlauf
              // aussehen wird, sobald zwei echte Ablesungen vorliegen.
              <div className="relative overflow-hidden rounded-2xl bg-surface-2/40 px-3.5 py-3">
                <span className="absolute right-2.5 top-2.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t('monitoring.overview.exampleBadge')}
                </span>
                <div className="pointer-events-none opacity-40">
                  <Sparkline values={EXAMPLE_SERIES} color={meta.accent} height={44} />
                </div>
                <p className="mt-2 text-xs text-muted">{t('monitoring.overview.ghostHint')}</p>
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          {t('monitoring.overview.add')}
        </button>
      </div>
    </section>
  )
}

/** Kompakte, aber lebendige Kachel eines Energieträgers. */
function MeterTile({ type, due }: MeterProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)
  const meterConfig = useReadingsStore((s) => s.meters[type])

  const meta = ENERGY_META[type]
  const isLevel = meterMode(meterConfig) === 'level'
  const Icon = meta.icon
  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings[readings.length - 1]
  const series = readings.map((r) => r.value)
  const dates = readings.map((r) => r.date)
  const trend = consumptionTrend(counterSeries(readings, meterConfig))
  const range = meterRange(readings, meterConfig, { seasonal: isSeasonal(type) })

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  return (
    <button
      type="button"
      onClick={() => navigate(`/monitoring/${type}`)}
      className="glass relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-3xl p-4 text-left transition-[transform,background-color] duration-200 hover:bg-surface-2/60 active:scale-[0.97]"
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="grid place-items-center w-10 h-10 rounded-2xl"
          style={{ background: `${meta.accent}1f`, color: meta.accent }}
        >
          <Icon className="w-5 h-5" />
        </span>
        {due ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {isRefillDue(range) ? t('monitoring.tank.refillDue') : t('monitoring.reminder.due')}
          </span>
        ) : trend ? (
          <TrendBadge trend={trend} compact />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted" />
        )}
      </div>

      <div className="w-full min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {t(`monitoring.energyTypes.${type}`)}
        </p>
        {latest ? (
          <p className="mt-0.5 text-base font-bold tabular-nums truncate">
            {isLevel
              ? Math.round(toPercent(latest.value, meterConfig?.capacity))
              : numFmt.format(latest.value)}
            <span className="ml-1 text-xs font-medium text-muted">
              {isLevel ? '%' : meta.unit}
            </span>
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted truncate">{t('monitoring.overview.empty')}</p>
        )}
      </div>

      {series.length > 0 && (
        <div className="-mb-1 w-full">
          <Sparkline values={series} dates={dates} color={meta.accent} height={28} />
        </div>
      )}
    </button>
  )
}
