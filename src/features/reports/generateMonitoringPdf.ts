import type { TFunction } from 'i18next'
import { hexToRgb, type PdfKit, type KpiCard, type IntervalBar, type RGB } from './pdf/pdfKit'
import { ENERGY_META } from '@/features/monitoring/energyConfig'
import {
  numberFmt,
  currencyFmt,
  fmtVal,
  fmtCur,
  fmtDate,
  fmtDateShort,
  fmtPeriod,
} from './pdf/format'
import type { MonitoringReportData, MonitoringEntry } from './monitoringReportData'

/**
 * Der Monitoring-Abschnitt des Energieberichts. Wird von
 * {@link generateReportPdf} in ein bestehendes Dokument geschrieben.
 */

export interface GenerateMonitoringArgs {
  t: TFunction
  language: string
  data: MonitoringReportData
  /** Objektname (Profilname) für Kopfzeile und Dateiname. */
  objectName?: string
}

/** Schreibt den Monitoring-Abschnitt (auch vom Gesamt-Bericht genutzt). */
export function fillMonitoring(
  kit: PdfKit,
  { t, language, data, objectName }: GenerateMonitoringArgs,
  withHeader = true,
): void {
  if (withHeader) {
    kit.masthead({
      title: t('report.pdf.monitoring.title'),
      subtitle: objectName,
      meta: periodLine(t, language, data),
      date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
    })
  } else {
    // Im Gesamt-Bericht trägt der Kopf bereits das Objekt – hier genügt die
    // Zeitraum-Zeile über dem Abschnitt.
    kit.subtle(periodLine(t, language, data))
    kit.gap(10)
  }

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.monitoring'))
    return
  }

  // Mengen ohne Nachkommastellen (Zählerstände sind ohnehin nicht genauer),
  // Tagesmittel mit zwei – sonst wären 0,22 m³/Tag schlicht „0".
  const num = numberFmt(language, 0)
  const numFine = numberFmt(language, 2)
  const cur = currencyFmt(language)

  writeSummaryTable(kit, t, language, num, cur, data)

  // Träger ohne Ablesung bekommen keine eigene Seite: eine Überschrift plus
  // „Noch keine Ablesung" füllt kein Blatt, und drei solcher Blätter am Ende
  // lassen den Bericht wie einen Fehldruck aussehen. Sie stehen gesammelt in
  // einer Zeile darunter.
  const measured = data.entries.filter((e) => e.currentValue !== undefined)
  const unmeasured = data.entries.filter((e) => e.currentValue === undefined)

  // Der Hinweis steht vor den Zähler-Seiten, nicht hinter ihnen: Dort
  // beantwortet er beim Lesen die Frage „und der Gaszähler?", statt als
  // einzelne Zeile hinter der letzten vollen Seite zu stranden.
  if (unmeasured.length > 0) {
    kit.subtle(
      t('report.pdf.monitoring.withoutReading', {
        carriers: unmeasured.map((e) => t(`monitoring.energyTypes.${e.type}`)).join(', '),
      }),
    )
    kit.gap(4)
  }

  measured.forEach((e, idx) => {
    // Jeder Zähler bekommt eine eigene Seite – sonst entscheidet der Zufall des
    // Seitenumbruchs, wo ein Träger aufhört.
    if (idx > 0) kit.newPage()
    writeCarrier(kit, t, language, num, numFine, cur, e)
  })
}

/**
 * Übersicht über alle ausgewerteten Träger: Verbrauch, Hochrechnung und Kosten
 * nebeneinander, mit Summe der Jahreskosten. Bei nur einem Träger mit Daten
 * wiederholt sie nur dessen Kennzahlen und entfällt deshalb.
 */
function writeSummaryTable(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  data: MonitoringReportData,
): void {
  const withData = data.entries.filter((e) => e.consumption !== undefined)
  if (withData.length < 2) return

  const rows = withData.map((e) => [
    t(`monitoring.energyTypes.${e.type}`),
    // Ohne die Zeitraumspalte wirkt eine Jahres-Hochrechnung unterhalb des
    // Verbrauchs wie ein Rechenfehler – tatsächlich umfasst der Verbrauch dann
    // mehr als ein Jahr.
    e.days !== undefined ? t('report.facts.days', { count: e.days }) : '-',
    fmtVal(e.consumption, e.unit, num),
    fmtVal(e.projectedYear, e.unit, num),
    e.costYear !== undefined ? fmtCur(e.costYear, cur) : '-',
  ])

  const costs = withData.map((e) => e.costYear).filter((c): c is number => c !== undefined)
  if (costs.length > 1) {
    rows.push([
      t('report.pdf.monitoring.totalRow'),
      '',
      '',
      '',
      fmtCur(costs.reduce((a, b) => a + b, 0), cur),
    ])
  }

  kit.subHead(t('report.pdf.monitoring.summary'), { keepWith: 3 * 19 })
  kit.table(
    [
      t('report.pdf.monitoring.carrier'),
      t('report.pdf.monitoring.periodColumn'),
      t('report.kpi.consumption'),
      t('report.kpi.projectedYear'),
      t('report.kpi.costYear'),
    ],
    rows,
    {
      align: ['left', 'right', 'right', 'right', 'right'],
      widths: [1.15, 0.8, 1.05, 1.15, 0.95],
      emphasizeLast: costs.length > 1,
    },
  )
  if (language) void language
  kit.gap(6)
}

/**
 * Balken je Ablesezeitraum – als Verbrauch **pro Tag** und über einer echten
 * Zeitachse. Absolute Intervallverbräuche wären nicht vergleichbar, sobald die
 * Abstände zwischen den Ablesungen ungleich sind: ein Jahresintervall ergäbe
 * zwangsläufig den höchsten Balken. Die gestrichelte Linie zeigt den Mittelwert
 * über den gesamten Zeitraum, damit einzelne Intervalle einzuordnen sind.
 */
function writeConsumptionChart(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  e: MonitoringEntry,
  height: number,
): void {
  // Ein einzelner Balken ist kein Verlauf – dann steht statt des Diagramms
  // der Grund dafür. Den Hinweis zur Balkenbreite gibt es nur, wenn es auch
  // Balken gibt.
  const drawable = e.segments.length >= 2
  kit.chartCaption(
    t('report.pdf.monitoring.consumptionChart'),
    drawable ? t('report.pdf.monitoring.chartHint') : undefined,
    { keepWith: drawable ? height : 0 },
  )
  if (!drawable) {
    kit.intervalBarChart([], { emptyNote: t('report.pdf.monitoring.noSegments') })
    return
  }

  const bars: IntervalBar[] = e.segments.map((seg) => ({
    from: seg.from,
    to: seg.to,
    value: seg.value / seg.days,
  }))
  const unit = t('report.pdf.monitoring.perDayUnit', { unit: e.unit })

  kit.intervalBarChart(bars, {
    height,
    unit,
    language,
    color: carrierColor(e),
    reference:
      e.perDay !== undefined
        ? {
            value: e.perDay,
            label: t('report.pdf.monitoring.averageLine', {
              value: `${num.format(e.perDay)} ${unit}`,
            }),
          }
        : undefined,
  })
}

/**
 * Zählerstandsverlauf als Linie. Unter zwei Ablesungen gibt es keine Linie –
 * dann steht dort der Grund und keine leere Fläche.
 */
function writeReadingCurve(
  kit: PdfKit,
  t: TFunction,
  language: string,
  e: MonitoringEntry,
  height: number,
): void {
  kit.chartCaption(t('report.pdf.monitoring.readingCurveTitle'), undefined, { keepWith: height })
  kit.lineChart(e.points, {
    height,
    unit: e.unit,
    language,
    color: carrierColor(e),
    emptyNote: t('report.pdf.monitoring.noCurve'),
  })
}

/** Akzentfarbe des Energieträgers – dieselbe wie in der App. */
function carrierColor(e: MonitoringEntry): RGB {
  return hexToRgb(ENERGY_META[e.type].accent)
}

/** Ab hier gilt eine Ablesung als zu alt, um daraus verlässlich hochzurechnen. */
const STALE_AFTER_DAYS = 120

/**
 * Warnt, wenn die letzte Ablesung lange zurückliegt. Ohne den Hinweis liest
 * sich eine Jahreshochrechnung aus anderthalb Jahre alten Daten wie ein
 * aktueller Wert.
 */
function writeStaleNote(kit: PdfKit, t: TFunction, e: MonitoringEntry): void {
  if (e.currentAgeDays === undefined || e.currentAgeDays < STALE_AFTER_DAYS) return
  kit.subtle(t('report.pdf.monitoring.staleReading', { count: e.currentAgeDays }))
}

/**
 * Kennzahl-Kacheln eines Trägers. Beim Zeitraum „Alle" beginnt das Fenster beim
 * ersten Zählerstand – ist der null, sind „Aktueller Stand" und „Verbrauch"
 * dieselbe Zahl. Dann tritt das Tagesmittel an die Stelle der Wiederholung.
 */
function meterCards(
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  numFine: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MonitoringEntry,
  opts: { withRate: boolean },
): KpiCard[] {
  const basisDays =
    e.days !== undefined ? t('report.kpi.sub.basisDays', { count: e.days }) : undefined
  const redundant = e.consumption !== undefined && e.consumption === e.currentValue

  const cards: KpiCard[] = [
    {
      value: fmtVal(e.currentValue, e.unit, num),
      label: t('report.kpi.currentValue'),
      sub: e.currentDate
        ? t('report.kpi.sub.asOf', { date: fmtDateShort(e.currentDate, language) })
        : undefined,
    },
  ]

  if (redundant) {
    cards.push({
      value: fmtVal(e.perDay, e.unit, numFine),
      label: t('report.kpi.perDay'),
      sub: basisDays,
    })
  } else {
    cards.push({
      value: fmtVal(e.consumption, e.unit, num),
      label: t('report.kpi.consumption'),
      sub: windowSub(language, e),
    })
  }

  if (opts.withRate) {
    if (!redundant) {
      cards.push({
        value: fmtVal(e.perDay, e.unit, numFine),
        label: t('report.kpi.perDay'),
        sub: basisDays,
      })
    }
    cards.push({
      value: fmtVal(e.projectedYear, e.unit, num),
      label: t('report.kpi.projectedYear'),
      sub: basisDays,
    })
  }

  if (e.hasCost && e.costYear !== undefined) {
    cards.push({
      value: fmtCur(e.costYear, cur),
      label: t('report.kpi.costYear'),
      sub: priceSub(t, language, e),
    })
  }

  // Spezifischer Kennwert: die Zahl, mit der man sich vergleichen kann.
  // Absolutwerte sagen ohne Wohnungsgröße bzw. Haushaltsgröße wenig aus.
  if (e.specific !== undefined && e.specificBasis) {
    const unit = t(SPECIFIC_UNIT_KEY[e.specificBasis])
    cards.push({
      value: `${num.format(Math.round(e.specific))} ${unit}`,
      label: t('report.kpi.specific'),
    })
  }
  return cards
}

/** Anzeige-Einheit je Bezugsgröße (dieselben Texte wie in der App). */
const SPECIFIC_UNIT_KEY = {
  perAreaKwh: 'monitoring.detail.specificPerArea',
  perPersonLiterDay: 'monitoring.detail.specificPerPersonDay',
} as const

/** Historie mit ehrlichem Hinweis, wenn gekürzt wurde. */
function writeHistory(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  e: MonitoringEntry,
  maxRows?: number,
): void {
  if (e.history.length === 0) return
  const newestFirst = [...e.history].reverse()
  const shown = maxRows === undefined ? newestFirst : newestFirst.slice(0, maxRows)
  kit.historyTable(
    [t('report.pdf.monitoring.historyDate'), t('report.pdf.monitoring.historyValue')],
    shown.map((r) => [fmtDate(r.date, language), fmtVal(r.value, e.unit, num)]),
  )
  const hidden = newestFirst.length - shown.length
  if (hidden > 0) kit.subtle(t('report.pdf.monitoring.historyMore', { count: hidden }))
}

/**
 * Zeitraum-Zeile für den Kopf: gewählter Umfang, tatsächlich ausgewerteter
 * Datumsbereich und Anzahl Ablesungen – „Zeitraum: Alle" allein sagt nichts.
 */
function periodLine(t: TFunction, language: string, data: MonitoringReportData): string {
  const key = data.rangeDays === null ? 'all' : `d${data.rangeDays}`
  const parts = [t('report.pdf.monitoring.subtitle', { range: t(`report.range.${key}`) })]
  if (data.from && data.to) {
    parts.push(fmtPeriod(data.from, data.to, language))
  }
  if (data.readingCount > 0) {
    parts.push(t('report.facts.readings', { count: data.readingCount }))
  }
  return parts.join(' · ')
}

/** „Basis: 35 ct/kWh" – macht die Kostenherleitung im Bericht nachvollziehbar. */
function priceSub(t: TFunction, language: string, e: MonitoringEntry): string | undefined {
  if (e.priceWork === undefined || !e.priceUnit) return undefined
  const fmt = numberFmt(language, 2)
  return t('report.kpi.sub.basis', { value: `${fmt.format(e.priceWork)} ${e.priceUnit}` })
}

/** Datumsbereich der Ablesungen eines Trägers, für die Kachel-Unterzeile. */
function windowSub(language: string, e: MonitoringEntry): string | undefined {
  if (!e.windowFrom || !e.windowTo) return undefined
  return fmtPeriod(e.windowFrom, e.windowTo, language)
}

/** Zähler-Seite: Diagramm, Kennzahlen, Trend, Zählerstandsverlauf, Historie. */
function writeCarrier(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  numFine: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MonitoringEntry,
): void {
  // Titel + Diagramm + KPIs zusammenhalten (Historie darf umbrechen).
  kit.ensure(36 + 184 + 150 + 19)
  kit.carrierHead(t(`monitoring.energyTypes.${e.type}`), carrierColor(e))

  writeConsumptionChart(kit, t, language, numFine, e, 165)
  kit.gap(6)

  const cards = meterCards(t, language, num, numFine, cur, e, { withRate: true })
  // Vier Kacheln als 2x2 statt 3+1 – eine einzelne Kachel in der zweiten
  // Reihe wirkt wie ein Umbruchfehler.
  kit.kpiCards(cards, cards.length === 4 ? 2 : 3)
  writeStaleNote(kit, t, e)

  // Nur zeigen, wenn es einen Vergleichswert gibt – ein Label ohne Zahl
  // erklärt nichts.
  if (e.changePercent !== undefined) {
    kit.trendBadge(e.changePercent, t('report.trend.vsPrevious'))
    kit.gap(2)
  }

  kit.gap(4)
  writeReadingCurve(kit, t, language, e, 150)
  kit.gap(6)
  writeHistory(kit, t, language, num, e)
}
