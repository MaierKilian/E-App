import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Plus, Trash2, ChevronDown, Pencil, RotateCcw, Truck, Settings2 } from 'lucide-react'
import { useReadingsStore, type EnergyType, type MeterReading } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore, resolvePrice, resolveEnergyContent } from '@/store/tariffStore'
import { useWidgetOrderStore } from '@/store/widgetOrderStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { ENERGY_META, isSeasonal } from './energyConfig'
import { PRICE_META } from './priceConfig'
import { AbsoluteLineChart, type LinePoint } from './AbsoluteLineChart'
import { AddReadingScreen } from './AddReadingScreen'
import { ReadingReminder } from './ReadingReminder'
import { TariffModal } from './TariffModal'
import { sortByDate, stats, consumptionTrend, daysSinceLastReading } from './readings'
import { counterSeries, isTankType, meterMode } from './counterSeries'
import { AddRefillScreen } from './AddRefillScreen'
import { MeterSetupScreen } from './MeterSetupScreen'
import { toPercent } from './fillLevel'
import { isRefillDue, meterRange } from './range'
import { TrendBadge } from './MeterTrend'
import { specificValue } from './specificValues'
import { filterByRange, fullSpan, RANGE_KEYS, type RangeKey } from './rangeFilter'
import { todayIso } from '@/lib/timeAxis'


/**
 * Detailseite eines Energieträgers (`/monitoring/:type`).
 * Kompakt gehalten: schlanker Kopf, kleine aktuelle Stand-Zeile, großer
 * „+ Ablesung"-Button (öffnet vollflächigen Eingabe-Screen), Diagramm,
 * eingeklappte Historie und – bei Strom – Kosten + Strompreis-Chip.
 */
/** Anzeige-Einheit je Bezugsgröße des spezifischen Kennwerts. */
const SPECIFIC_UNIT_KEY = {
  perAreaKwh: 'monitoring.detail.specificPerArea',
  perPersonLiterDay: 'monitoring.detail.specificPerPersonDay',
} as const

export function MeterDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { type: rawType } = useParams<{ type: string }>()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const deleteReading = useReadingsStore((s) => s.deleteReading)
  const removeType = useReadingsStore((s) => s.removeType)
  const hideType = useWidgetOrderStore((s) => s.hideType)

  const [addOpen, setAddOpen] = useState(false)
  const [refillOpen, setRefillOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [editing, setEditing] = useState<MeterReading | null>(null)
  const [tariffOpen, setTariffOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [range, setRange] = useState<RangeKey>('all')
  // Grenzen des freien Zeitraums, leer bis der Nutzer sie setzt.
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [now] = useState(() => Date.now())

  const type = rawType as EnergyType
  const priceWork = useTariffStore((st) => resolvePrice(st, type).work)
  const kwhPerUnit = useTariffStore((st) => resolveEnergyContent(st, type))
  const meterConfig = useReadingsStore((st) => st.meters[type])
  // Nur ein der App unbekannter Träger führt zurück. Die frühere Sperre
  // („nicht im Profil" → Umleitung) ist entfallen: Wer im Schnellstart keine PV
  // angegeben hat, konnte seine Erzeugung sonst nie erfassen.
  if (!type || !(type in ENERGY_META)) {
    return <Navigate to="/monitoring" replace />
  }

  const meta = ENERGY_META[type]
  const Icon = meta.icon
  const unit = meta.unit
  const name = t(`monitoring.energyTypes.${type}`)

  const readings = sortByDate(readingsByType[type] ?? [])
  // Verlauf, Liste und Eingabe zeigen den abgelesenen Wert; gerechnet wird auf
  // der virtuellen Zählerreihe, die einen Vorrat in kumulierten Verbrauch
  // übersetzt (bei einem Zählwerk ist sie die Reihe selbst).
  const counted = counterSeries(readings, meterConfig)
  const isLevel = meterMode(meterConfig) === 'level'
  const capacity = meterConfig?.capacity
  // Die Detailseite ist direkt erreichbar (Kachel auf dem Board). Ohne diese
  // Weiche käme ein noch nicht eingerichteter Öltank hier am Einrichten vorbei
  // und landete stillschweigend im Zählwerk-Modell.
  //
  // Ausdrücklich nur für einen **neuen** Zähler: Wer seinen Öl-Zähler schon
  // führt, bekommt die Frage nicht vorgesetzt. Sonst stünde er vor einer
  // Auswahl mit „Vorrat" vorbelegt und deutete mit einem Tipp auf Speichern
  // seinen ganzen bisherigen Verlauf um. Umstellen geht über die
  // Zähler-Einstellungen – dort, wo man es sucht, und mit Warnung.
  const needsSetup = isTankType(type) && meterConfig === undefined && readings.length === 0
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined
  const defaultValue = latest ? (isLevel ? latest.value : Math.trunc(latest.value)) : 0

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  // Spezifische Kennwerte sind Orientierungsgrössen – Nachkommastellen
  // taeuschten eine Genauigkeit vor, die die Eingangsdaten nicht hergeben.
  const specificFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const rangeFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' })
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const historyDateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  /** Zeigt das (bearbeitbare) Ablese-Datum an. */
  function formatDate(date: string): string {
    const d = new Date(`${date}T00:00:00`)
    return Number.isNaN(d.getTime()) ? date : historyDateFmt.format(d)
  }

  /** Löschen mit kurzer Rückfrage (verhindert versehentliches Entfernen). */
  function handleDelete(id: string) {
    if (window.confirm(t('monitoring.readings.deleteConfirm'))) {
      deleteReading(type, id)
    }
  }

  /**
   * Entfernt den Zähler ganz: Ablesungen löschen **und** den Träger ausblenden.
   *
   * Beides ist nötig. Nur löschen genügt nicht, weil das Profil Strom, Wasser
   * und den eigenen Wärmeerzeuger weiter vorschlägt – der Zähler stünde sofort
   * wieder auf dem Board. Nur ausblenden genügt ebenso wenig: Die Ablesungen
   * flössen weiter in Berichte und Empfehlungen ein, die den Zähler gar nicht
   * mehr anzeigen. Die Rückfrage nennt deshalb die Zahl der Ablesungen, die
   * dabei verloren geht.
   */
  function handleRemoveMeter() {
    const confirmed = window.confirm(
      readings.length > 0
        ? t('monitoring.detail.removeMeterConfirm', { name, count: readings.length })
        : t('monitoring.detail.removeMeterConfirmEmpty', { name }),
    )
    if (!confirmed) return
    removeType(type)
    hideType(type)
    navigate('/monitoring')
  }

  const priceMeta = PRICE_META[type]
  const eurPerUnit = priceMeta ? priceWork * priceMeta.priceToEur : undefined
  const s = stats(counted, eurPerUnit, { seasonal: isSeasonal(type) })
  // Spezifischer Kennwert: der Jahresverbrauch bezogen auf Fläche bzw. Personen –
  // erst damit lässt sich der eigene Verbrauch überhaupt einordnen.
  const specific = specificValue(
    type,
    s.projectedYearKwh,
    data,
    kwhPerUnit,
  )
  const trend = consumptionTrend(counted)
  // Nicht `range` – so heißt hier schon der Zeitraum-Filter des Diagramms.
  const rangeEstimate = meterRange(readings, meterConfig, {
    seasonal: isSeasonal(type),
    today: new Date(now),
  })
  const emptyDate = rangeEstimate
    ? new Date(`${rangeEstimate.emptyDate}T00:00:00`)
    : undefined
  const sinceDays = daysSinceLastReading(readings, now)
  const lastText =
    sinceDays === undefined
      ? null
      : sinceDays === 0
        ? t('monitoring.overview.readToday')
        : t('monitoring.overview.readDaysAgo', { count: sinceDays })

  // Diagramm-Punkte nach Zeitraum filtern.
  const allPoints: LinePoint[] = readings.map((r) => ({
    date: r.date,
    value: r.value,
    ...(r.refill !== undefined ? { refill: r.refill } : {}),
  }))
  const points = filterByRange(allPoints, range, now, customFrom, customTo)

  // Volle Messspanne – Vorbelegung und Ziel des Zurücksetzens für den freien
  // Zeitraum (Begründung siehe `fullSpan`).
  const { from: spanFrom, to: spanTo } = fullSpan(allPoints)
  const rangeIsFullSpan = customFrom === spanFrom && customTo === spanTo

  /** Zeitraum wechseln; der freie Zeitraum startet auf der vollen Messspanne. */
  function handleRangeChange(key: RangeKey) {
    setRange(key)
    if (key === 'custom' && !customFrom && !customTo) {
      setCustomFrom(spanFrom)
      setCustomTo(spanTo)
    }
  }

  return (
    <div className="space-y-4">
      {/* Kopf: Zurück + Träger-Hero + Diagramm im Stil der Übersicht */}
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="flex items-center gap-1 -ml-1 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('monitoring.detail.back')}
      </button>
      {/* Hero-Karte: gleicher Stil wie die Monitoring-Übersicht */}
      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
          style={{ background: meta.accent, opacity: 0.16 }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
                style={{ background: `${meta.accent}1f`, color: meta.accent }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-semibold leading-tight text-foreground truncate">
                  {name}
                </h1>
                {lastText && <p className="text-xs text-muted">{lastText}</p>}
              </div>
            </div>
            {trend && (
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <TrendBadge trend={trend} />
                {trend.changePct !== undefined && (
                  <span className="text-[10px] leading-tight text-muted">
                    {t('monitoring.detail.trendCaption')}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              {isLevel ? t('monitoring.tank.currentLevel') : t('monitoring.detail.current')}
            </p>
            {latest ? (
              isLevel ? (
                <>
                  <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                    {Math.round(toPercent(latest.value, capacity))}
                    <span className="ml-1 text-base font-medium text-muted">%</span>
                  </p>
                  {capacity !== undefined && capacity > 0 && (
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {numFmt.format(latest.value)} {unit}{' '}
                      {t('monitoring.tank.ofCapacity', {
                        total: numFmt.format(capacity),
                        unit,
                      })}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                  {numFmt.format(latest.value)}
                  <span className="ml-1 text-base font-medium text-muted">{unit}</span>
                </p>
              )
            ) : (
              <p className="mt-0.5 text-base text-muted">{t('monitoring.detail.noReadings')}</p>
            )}
          </div>

          {/* Reichweite: beim Vorrat die eigentliche Auskunft – ein Zählwerk
              kann sie nicht geben. Die Grundlage steht dabei, damit niemand
              eine Schätzung für eine Messung hält (wie bei ProjectionBasis). */}
          {rangeEstimate && emptyDate && (
            <div
              className="mt-4 rounded-2xl px-3 py-2.5"
              style={{
                background: isRefillDue(rangeEstimate)
                  ? `${meta.accent}1f`
                  : 'var(--color-surface-2)',
              }}
            >
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {t('monitoring.tank.rangeLabel')}
              </p>
              <p className="mt-0.5 font-semibold text-foreground">
                {t('monitoring.tank.rangeUntil', { date: rangeFmt.format(emptyDate) })}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted">
                {t('monitoring.tank.rangeDays', { count: rangeEstimate.days })} ·{' '}
                {t(
                  rangeEstimate.basis === 'seasonal'
                    ? 'monitoring.tank.rangeBasisSeasonal'
                    : 'monitoring.tank.rangeBasisLinear',
                )}
              </p>
            </div>
          )}

          {/* Kennzahlen: Verbrauch & Jahreskosten als aufgeräumte Mini-Kacheln */}
          {priceMeta && (s.lastConsumptionKwh !== undefined || s.projectedYearCostEur !== undefined) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {/* Kacheln: Verbrauch, Jahreskosten, spezifischer Kennwert. */}
              <div className="rounded-2xl bg-surface-2/60 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {t('monitoring.detail.consumption')}
                </p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                  {s.lastConsumptionKwh !== undefined
                    ? `${numFmt.format(s.lastConsumptionKwh)} ${unit}`
                    : '–'}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted tabular-nums">
                  {s.lastConsumptionDays !== undefined
                    ? t('monitoring.detail.consumptionDays', { count: s.lastConsumptionDays })
                    : ' '}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-2/60 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {t('monitoring.detail.cost')}
                </p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                  {s.projectedYearCostEur !== undefined
                    ? eurFmt.format(s.projectedYearCostEur)
                    : '–'}
                </p>
                {/* Statt nur „hochgerechnet": worauf die Zahl beruht. Ein
                    echter Jahreswert und eine Schaetzung aus vier Monaten sind
                    sehr unterschiedlich belastbar. */}
                <p className="mt-0.5 text-[11px] leading-tight text-muted">
                  {s.projectedYearCostEur === undefined
                    ? ' '
                    : s.projectionBasis === 'fullYear'
                      ? t('monitoring.detail.costBasisFullYear')
                      : t('monitoring.detail.costBasisEstimate', {
                          months: Math.max(1, Math.round((s.projectionDays ?? 0) / 30)),
                        })}
                </p>
              </div>
              {specific && (
                <div className="col-span-2 rounded-2xl bg-surface-2/60 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted">
                    {t('monitoring.detail.specific')}
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {specificFmt.format(specific.value)}{' '}
                    <span className="text-xs font-medium text-muted">
                      {t(SPECIFIC_UNIT_KEY[specific.basis])}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preis-Zeile: für jeden kostenfähigen Träger bearbeitbar */}
          {priceMeta && (
            <button
              type="button"
              onClick={() => setTariffOpen(true)}
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-2xl bg-surface-2/60 px-3 py-2.5 text-sm hover:bg-surface-2 transition-colors"
            >
              <span className="text-muted">{t('monitoring.price.label')}</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="tabular-nums">
                  {numFmt.format(priceWork)} {priceMeta.priceUnit}
                </span>
                <Pencil className="w-3.5 h-3.5 text-muted" />
              </span>
            </button>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => (needsSetup ? setSetupOpen(true) : setAddOpen(true))}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {isLevel ? t('monitoring.tank.addLevel') : t('monitoring.detail.addReading')}
            </button>
            {/* Die Lieferung ist eine eigene Aktion, weil sie eine eigene Zahl
                trägt: Ohne die gelieferte Menge lässt sich der Verbrauch im
                Auffüll-Zeitraum nicht berechnen. */}
            {isLevel && (
              <button
                type="button"
                onClick={() => setRefillOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-transform active:scale-[0.98] hover:bg-surface-2/70"
              >
                <Truck className="w-4 h-4" />
                {t('monitoring.tank.addRefill')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Diagramm-Karte */}
      {readings.length > 0 && (
        <section className="glass space-y-3 rounded-3xl p-4">
          <div className="flex flex-wrap gap-2">
            {RANGE_KEYS.map((key) => (
              <SelectChip
                key={key}
                label={t(`monitoring.readings.range.${key}`)}
                selected={range === key}
                onClick={() => handleRangeChange(key)}
              />
            ))}
          </div>

          {/* Freier Zeitraum: erst nach der Wahl sichtbar, damit die schlichte
              Stufen-Auswahl nicht dauerhaft zwei Datumsfelder mitträgt. */}
          {range === 'custom' && (
            <div className="rounded-2xl bg-surface-2/50 p-3">
              {/* Zwei feste Spalten statt umbrechendem Flex: Die Felder sind
                  gleich breit und stehen auch auf schmalen Geräten nebeneinander
                  – „von" über „bis" gestapelt las sich wie zwei getrennte
                  Eingaben statt wie ein Zeitraum. */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {t('monitoring.readings.rangeFrom')}
                  </span>
                  {/* `appearance-none` und die feste Höhe zähmen das native
                      Feld: iOS gibt ihm sonst eine eigene, deutlich größere
                      Grundhöhe und setzt den Text nicht mittig. */}
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || todayIso()}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="focus-ring h-10 w-full appearance-none rounded-xl border border-border bg-surface px-3 text-sm leading-none text-foreground tabular-nums"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {t('monitoring.readings.rangeTo')}
                  </span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    max={todayIso()}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="focus-ring h-10 w-full appearance-none rounded-xl border border-border bg-surface px-3 text-sm leading-none text-foreground tabular-nums"
                  />
                </label>
              </div>
              {/* Zurücksetzen führt auf die volle Messspanne zurück, nicht auf
                  zwei leere Felder – sonst stünde man wieder vor blanken Kästen.
                  Deshalb erscheint es auch nur, solange etwas eingegrenzt ist. */}
              {!rangeIsFullSpan && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomFrom(spanFrom)
                    setCustomTo(spanTo)
                  }}
                  className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('monitoring.readings.rangeReset')}
                </button>
              )}
            </div>
          )}

          {/* Liegen im gewählten Zeitraum keine Ablesungen, tritt dieser Hinweis
              an die Stelle des Diagramms. Dessen eigener Leertext fordert zum
              Eintragen des ersten Zählerstands auf – hier wäre das falsch:
              Ablesungen gibt es, nur nicht in diesem Zeitraum. */}
          {points.length === 0 && readings.length > 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted">
              {t('monitoring.readings.rangeEmpty')}
            </p>
          ) : (
            <AbsoluteLineChart points={points} unit={unit} accent={meta.accent} />
          )}
        </section>
      )}

      {/* Historie (eingeklappt) */}
      {readings.length > 0 && (
        <div className="glass rounded-2xl">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground"
          >
            {t('monitoring.detail.history')}
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
            <ul className="space-y-1 px-3 pb-3">
              {[...readings].reverse().map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-foreground tabular-nums">
                      {numFmt.format(r.value)} {unit}
                      {r.refill !== undefined && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: `${meta.accent}1f`, color: meta.accent }}
                        >
                          <Truck className="h-3 w-3" />
                          +{numFmt.format(r.refill)}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {formatDate(r.date)}
                      {r.refillCostEur !== undefined && ` · ${eurFmt.format(r.refillCostEur)}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      aria-label={t('monitoring.readings.edit')}
                      className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      aria-label={t('monitoring.readings.delete')}
                      className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Erinnerung (kompakt) */}
      <ReadingReminder readings={readings} type={type} config={meterConfig} />

      {isTankType(type) && (
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          {t('monitoring.tank.settings')}
        </button>
      )}

      {/* Zähler entfernen – bewusst ganz unten, hinter allem Nützlichen, und
          ohne Signalfarbe: Es ist kein Weg, den man versehentlich geht. */}
      <button
        type="button"
        onClick={handleRemoveMeter}
        className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" />
        {t('monitoring.detail.removeMeter')}
      </button>

      {addOpen && (
        <AddReadingScreen
          type={type}
          unit={unit}
          typeLabel={name}
          accent={meta.accent}
          icon={Icon}
          defaultValue={defaultValue}
          level={isLevel}
          capacity={capacity}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editing && (
        <AddReadingScreen
          type={type}
          unit={unit}
          typeLabel={name}
          accent={meta.accent}
          icon={Icon}
          defaultValue={defaultValue}
          // Eine Lieferung wird als Füllstand bearbeitet: Menge und Betrag
          // bleiben unangetastet, korrigiert wird der Stand danach.
          level={isLevel}
          capacity={capacity}
          editReading={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {refillOpen && (
        <AddRefillScreen type={type} config={meterConfig} onClose={() => setRefillOpen(false)} />
      )}
      {setupOpen && (
        <MeterSetupScreen
          type={type}
          isNew={needsSetup}
          onClose={(saved) => {
            setSetupOpen(false)
            // Wer über „Eintragen" hierher kam, will danach eintragen.
            if (saved && needsSetup) setAddOpen(true)
          }}
        />
      )}
      <TariffModal open={tariffOpen} onClose={() => setTariffOpen(false)} type={type} />
    </div>
  )
}
