import type { TFunction } from 'i18next'
import { PdfKit, type KpiCard } from './pdf/pdfKit'
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

  data.entries.forEach((e, idx) => {
    if (variant === 'short') writeShortEntry(kit, t, language, num, cur, e, options)
    else writeLongEntry(kit, t, language, num, cur, e, options)
    if (idx < data.entries.length - 1) kit.gap(10)
  })
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
  if (options.charts) est += 124
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
    kit.lineChart(e.points, { height: 116, unit: e.unit, language })
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
  if (options.charts) est += 178
  if (options.kpis) est += 150
  if (options.comparison) est += 19
  kit.ensure(est)

  kit.sectionTitle(t(`monitoring.energyTypes.${e.type}`))

  if (options.charts) {
    kit.lineChart(e.points, { height: 170, unit: e.unit, language })
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

  if (options.history && e.history.length > 0) {
    const headers = [t('report.pdf.monitoring.historyDate'), t('report.pdf.monitoring.historyValue')]
    const rows = [...e.history]
      .reverse()
      .map((r) => [fmtDate(r.date, language), fmtVal(r.value, e.unit, num)])
    kit.historyTable(headers, rows)
  }
}
