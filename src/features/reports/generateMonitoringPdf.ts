import type { TFunction } from 'i18next'
import { PdfKit, type KpiCard, type BarItem } from './pdf/pdfKit'
import {
  numberFmt,
  currencyFmt,
  fmtVal,
  fmtCur,
  fmtDate,
  fmtDateShort,
  reportFileName,
} from './pdf/format'
import type { ReportVariant, ReportContentOptions } from './reportTypes'
import type { MonitoringReportData, MonitoringEntry } from './monitoringReportData'

/** Höchstens so viele Historien-Zeilen im Kurzbericht; der Rest wird gezählt. */
const SHORT_HISTORY_ROWS = 8

/**
 * Erzeugt den Monitoring-Bericht (Kurz/Lang) als grafisches PDF und startet
 * den Download. Kurz = kompakte Karten + kleines Diagramm; Lang = großes
 * Diagramm, volle KPI-Reihe, Vergleich und Ablese-Historie.
 */

export interface GenerateMonitoringArgs {
  variant: ReportVariant
  options: ReportContentOptions
  t: TFunction
  language: string
  data: MonitoringReportData
  /** Objektname (Profilname) für Kopfzeile und Dateiname. */
  objectName?: string
}

export function generateMonitoringPdf(args: GenerateMonitoringArgs): void {
  const kit = new PdfKit()
  fillMonitoring(kit, args)
  kit.finalizeFooters(
    (n, total) => args.t('report.pdf.page', { n, total }),
    args.t('report.pdf.footnote'),
  )
  kit.save(reportFileName(args.t('report.types.monitoring.title'), args.objectName))
}

/** Schreibt den Monitoring-Abschnitt (auch vom Gesamt-Bericht genutzt). */
export function fillMonitoring(
  kit: PdfKit,
  { variant, options, t, language, data, objectName }: GenerateMonitoringArgs,
  withHeader = true,
): void {
  if (withHeader) {
    kit.headerBand({
      title: t('report.pdf.monitoring.title'),
      subtitle: objectName,
      meta: periodLine(t, language, data),
      date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
    })
  } else {
    // Im Gesamt-Bericht trägt der Kopf bereits das Objekt – hier genügt die
    // Zeitraum-Zeile über dem Abschnitt.
    kit.subtle(periodLine(t, language, data))
    kit.gap(4)
  }

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.monitoring'))
    return
  }

  const num = numberFmt(language, 1)
  const cur = currencyFmt(language)

  if (options.kpis) writeSummaryTable(kit, t, num, cur, data)

  data.entries.forEach((e, idx) => {
    // Im Langbericht bekommt jeder Zähler eine eigene Seite – sonst entscheidet
    // der Zufall des Seitenumbruchs, wo ein Träger aufhört.
    if (idx > 0) {
      if (variant === 'long') kit.newPage()
      else kit.gap(10)
    }
    if (variant === 'short') writeShortEntry(kit, t, language, num, cur, e, options)
    else writeLongEntry(kit, t, language, num, cur, e, options)
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
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  data: MonitoringReportData,
): void {
  const withData = data.entries.filter((e) => e.consumption !== undefined)
  if (withData.length < 2) return

  const rows = withData.map((e) => [
    t(`monitoring.energyTypes.${e.type}`),
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
      fmtCur(costs.reduce((a, b) => a + b, 0), cur),
    ])
  }

  kit.sectionTitle(t('report.pdf.monitoring.summary'))
  kit.table(
    [
      t('report.pdf.monitoring.carrier'),
      t('report.kpi.consumption'),
      t('report.kpi.projectedYear'),
      t('report.kpi.costYear'),
    ],
    rows,
    {
      align: ['left', 'right', 'right', 'right'],
      widths: [1.3, 1, 1.1, 1],
      emphasizeLast: costs.length > 1,
    },
  )
  kit.gap(6)
}

/**
 * Balken je Ablesezeitraum – bewusst als Verbrauch **pro Tag**. Absolute
 * Intervallverbräuche wären nicht vergleichbar, sobald die Abstände zwischen
 * den Ablesungen ungleich sind: ein Jahresintervall ergäbe zwangsläufig den
 * höchsten Balken, ganz unabhängig vom Verbrauchsverhalten.
 */
function writeConsumptionChart(
  kit: PdfKit,
  t: TFunction,
  language: string,
  e: MonitoringEntry,
  height: number,
): void {
  kit.body(t('report.pdf.monitoring.consumptionChart'), { size: 9, bold: true })
  if (e.segments.length === 0) {
    kit.subtle(t('report.pdf.monitoring.noSegments'))
    return
  }
  const bars: BarItem[] = e.segments.map((seg) => ({
    label: fmtDateShort(seg.to, language),
    value: seg.value / seg.days,
  }))
  kit.barChart(bars, {
    height,
    unit: t('report.pdf.monitoring.perDayUnit', { unit: e.unit }),
    language,
  })
}

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
    parts.push(
      t('report.facts.period', {
        from: fmtDateShort(data.from, language),
        to: fmtDateShort(data.to, language),
      }),
    )
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
function windowSub(t: TFunction, language: string, e: MonitoringEntry): string | undefined {
  if (!e.windowFrom || !e.windowTo) return undefined
  return t('report.facts.period', {
    from: fmtDateShort(e.windowFrom, language),
    to: fmtDateShort(e.windowTo, language),
  })
}

/** Kompakte Zähler-Karte (Kurzfassung): Stand, Verbrauch, Vergleich, Kosten + kleines Diagramm. */
function writeShortEntry(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MonitoringEntry,
  options: ReportContentOptions,
): void {
  if (e.currentValue === undefined) {
    kit.ensure(52)
    kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))
    kit.subtle(t('report.pdf.empty.noReading'))
    return
  }

  // Ganzen Block zusammenhalten (kein Umbruch mitten in Titel/KPIs/Diagramm).
  let est = 36
  if (options.kpis) est += 70
  if (options.comparison) est += 18
  if (options.charts) est += 130
  if (options.readingCurve) est += 124
  kit.ensure(est)

  kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))

  if (options.kpis) {
    const cards: KpiCard[] = [
      {
        value: fmtVal(e.currentValue, e.unit, num),
        label: t('report.kpi.currentValue'),
        sub: e.currentDate
          ? t('report.kpi.sub.asOf', { date: fmtDateShort(e.currentDate, language) })
          : undefined,
      },
      {
        value: fmtVal(e.consumption, e.unit, num),
        label: t('report.kpi.consumption'),
        sub: windowSub(t, language, e),
      },
    ]
    if (e.hasCost && e.costYear !== undefined) {
      cards.push({
        value: fmtCur(e.costYear, cur),
        label: t('report.kpi.costYear'),
        sub: priceSub(t, language, e),
      })
    }
    kit.kpiCards(cards, cards.length >= 3 ? 3 : 2)
  }

  // Nur zeigen, wenn es einen Vergleichswert gibt – ein Label ohne Zahl
  // erklärt nichts.
  if (options.comparison && e.changePercent !== undefined) {
    kit.trendBadge(e.changePercent, t('report.trend.vsPrevious'))
  }

  if (options.charts) {
    kit.gap(6)
    writeConsumptionChart(kit, t, language, e, 116)
  }

  if (options.readingCurve) {
    kit.gap(6)
    kit.body(t('report.pdf.monitoring.readingCurveTitle'), { size: 9, bold: true })
    kit.lineChart(e.points, { height: 110, unit: e.unit, language })
  }

  // Kurzbericht: nur die jüngsten Ablesungen, der Rest wird beziffert.
  if (options.history) {
    kit.gap(6)
    writeHistory(kit, t, language, num, e, SHORT_HISTORY_ROWS)
  }
}

/** Ausführliche Zähler-Seite (Langfassung). */
function writeLongEntry(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MonitoringEntry,
  options: ReportContentOptions,
): void {
  if (e.currentValue === undefined) {
    kit.ensure(52)
    kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))
    kit.subtle(t('report.pdf.empty.noReading'))
    return
  }

  // Titel + Diagramm + KPIs zusammenhalten (Historie darf umbrechen).
  let est = 36
  if (options.charts) est += 184
  if (options.kpis) est += 150
  if (options.comparison) est += 19
  kit.ensure(est)

  kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))

  if (options.charts) {
    writeConsumptionChart(kit, t, language, e, 160)
    kit.gap(6)
  }

  if (options.kpis) {
    // Unterzeilen benennen die Basis jeder Zahl – „Hochrechnung / Jahr" ohne
    // Mittelungszeitraum wäre eine Prognose ohne Herkunft.
    const basisDays =
      e.days !== undefined ? t('report.kpi.sub.basisDays', { count: e.days }) : undefined
    const cards: KpiCard[] = [
      {
        value: fmtVal(e.currentValue, e.unit, num),
        label: t('report.kpi.currentValue'),
        sub: e.currentDate
          ? t('report.kpi.sub.asOf', { date: fmtDateShort(e.currentDate, language) })
          : undefined,
      },
      {
        value: fmtVal(e.consumption, e.unit, num),
        label: t('report.kpi.consumption'),
        sub: windowSub(t, language, e),
      },
      { value: fmtVal(e.perDay, e.unit, num), label: t('report.kpi.perDay'), sub: basisDays },
      {
        value: fmtVal(e.projectedYear, e.unit, num),
        label: t('report.kpi.projectedYear'),
        sub: basisDays,
      },
    ]
    if (e.hasCost && e.costYear !== undefined) {
      cards.push({
        value: fmtCur(e.costYear, cur),
        label: t('report.kpi.costYear'),
        sub: priceSub(t, language, e),
      })
    }
    kit.kpiCards(cards, 3)
  }

  if (options.comparison && e.changePercent !== undefined) {
    kit.trendBadge(e.changePercent, t('report.trend.vsPrevious'))
    kit.gap(2)
  }

  if (options.readingCurve) {
    kit.gap(4)
    kit.body(t('report.pdf.monitoring.readingCurveTitle'), { size: 9, bold: true })
    kit.lineChart(e.points, { height: 150, unit: e.unit, language })
    kit.gap(6)
  }

  // Langbericht zeigt die vollständige Historie – hier ist Platz dafür.
  if (options.history) writeHistory(kit, t, language, num, e)
}
