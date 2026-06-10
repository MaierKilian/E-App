import type { TFunction } from 'i18next'
import { PdfKit, type KpiCard } from './pdf/pdfKit'
import { numberFmt, currencyFmt, fmtVal, fmtCur, fmtDate, todayIso } from './pdf/format'
import type { ReportVariant, ReportContentOptions } from './reportTypes'
import type { MonitoringReportData, MonitoringEntry } from './monitoringReportData'

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
}

export function generateMonitoringPdf(args: GenerateMonitoringArgs): void {
  const kit = new PdfKit()
  fillMonitoring(kit, args)
  kit.finalizeFooters(
    (n, total) => args.t('report.pdf.page', { n, total }),
    args.t('report.pdf.footnote'),
  )
  kit.save(`E-App-${args.t('report.types.monitoring.title')}-Bericht-${todayIso()}.pdf`)
}

/** Schreibt den Monitoring-Abschnitt (auch vom Gesamt-Bericht genutzt). */
export function fillMonitoring(
  kit: PdfKit,
  { variant, options, t, language, data }: GenerateMonitoringArgs,
  withHeader = true,
): void {
  if (withHeader) {
    kit.headerBand({
      title: t('report.pdf.monitoring.title'),
      subtitle: rangeSubtitle(t, data.rangeDays),
      date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
    })
  }

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.monitoring'))
    return
  }

  const num = numberFmt(language, 1)
  const cur = currencyFmt(language)

  data.entries.forEach((e, idx) => {
    if (variant === 'short') writeShortEntry(kit, t, language, num, cur, e, options)
    else writeLongEntry(kit, t, language, num, cur, e, options)
    if (idx < data.entries.length - 1) kit.gap(10)
  })
}

/** Untertitel mit dem ausgewerteten Zeitraum. */
function rangeSubtitle(t: TFunction, rangeDays: MonitoringReportData['rangeDays']): string {
  const key = rangeDays === null ? 'all' : `d${rangeDays}`
  return t('report.pdf.monitoring.subtitle', { range: t(`report.range.${key}`) })
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
  kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))

  if (e.currentValue === undefined) {
    kit.subtle(t('report.pdf.empty.noReading'))
    return
  }

  if (options.kpis) {
    const cards: KpiCard[] = [
      { value: fmtVal(e.currentValue, e.unit, num), label: t('report.kpi.currentValue') },
      { value: fmtVal(e.consumption, e.unit, num), label: t('report.kpi.consumption') },
    ]
    if (e.hasCost && e.costYear !== undefined) {
      cards.push({ value: fmtCur(e.costYear, cur), label: t('report.kpi.costYear') })
    }
    kit.kpiCards(cards, cards.length >= 3 ? 3 : 2)
  }

  if (options.comparison) {
    kit.trendBadge(e.changePercent, t('report.trend.vsPrevious'))
  }

  if (options.charts) {
    kit.gap(2)
    kit.lineChart(e.points, { height: 110, unit: e.unit, language })
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
  kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))

  if (e.currentValue === undefined) {
    kit.subtle(t('report.pdf.empty.noReading'))
    return
  }

  if (options.charts) {
    kit.lineChart(e.points, { height: 170, unit: e.unit, language })
    kit.gap(6)
  }

  if (options.kpis) {
    const cards: KpiCard[] = [
      { value: fmtVal(e.currentValue, e.unit, num), label: t('report.kpi.currentValue') },
      { value: fmtVal(e.consumption, e.unit, num), label: t('report.kpi.consumption') },
      { value: fmtVal(e.perDay, e.unit, num), label: t('report.kpi.perDay') },
      { value: fmtVal(e.projectedYear, e.unit, num), label: t('report.kpi.projectedYear') },
    ]
    if (e.hasCost && e.costYear !== undefined) {
      cards.push({ value: fmtCur(e.costYear, cur), label: t('report.kpi.costYear') })
    }
    kit.kpiCards(cards, 3)
  }

  if (options.comparison) {
    kit.trendBadge(e.changePercent, t('report.trend.vsPrevious'))
    kit.gap(2)
  }

  if (options.history && e.history.length > 0) {
    const headers = [t('report.pdf.monitoring.historyDate'), t('report.pdf.monitoring.historyValue')]
    const rows = [...e.history]
      .reverse()
      .map((r) => [fmtDate(r.date, language), fmtVal(r.value, e.unit, num)])
    kit.historyTable(headers, rows)
  }
}
