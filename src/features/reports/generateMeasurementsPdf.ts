import type { TFunction } from 'i18next'
import { PdfKit, ratingColor, type KpiCard } from './pdf/pdfKit'
import { numberFmt, currencyFmt, fmtVal, fmtCur, fmtDate, todayIso } from './pdf/format'
import type { ReportVariant, ReportContentOptions } from './reportTypes'
import type {
  MeasurementsReportData,
  MeasurementEntry,
  MeasurementGroup,
} from './measurementsReportData'

/**
 * Erzeugt den Messungen-Bericht (Kurz/Lang) als grafisches PDF und startet
 * den Download. Inhalte richten sich nach `options`.
 */

export interface GenerateMeasurementsArgs {
  variant: ReportVariant
  options: ReportContentOptions
  t: TFunction
  language: string
  data: MeasurementsReportData
}

export function generateMeasurementsPdf(args: GenerateMeasurementsArgs): void {
  const kit = new PdfKit()
  fillMeasurements(kit, args)
  kit.finalizeFooters(
    (n, total) => args.t('report.pdf.page', { n, total }),
    args.t('report.pdf.footnote'),
  )
  kit.save(`E-App-${args.t('report.types.measurements.title')}-Bericht-${todayIso()}.pdf`)
}

/**
 * Schreibt den Messungen-Abschnitt in ein bestehendes Kit
 * (auch vom Gesamt-Bericht genutzt). `withHeader=false` lässt den Kopfbalken weg.
 */
export function fillMeasurements(
  kit: PdfKit,
  { variant, options, t, language, data }: GenerateMeasurementsArgs,
  withHeader = true,
): void {
  const num = numberFmt(language, 1)
  const cur = currencyFmt(language)

  if (withHeader) {
    kit.headerBand({
      title: t('report.pdf.measurements.title'),
      subtitle: t('report.pdf.measurements.subtitle'),
      date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
    })
  }

  // Fortschritt als KPI-Reihe.
  const cards: KpiCard[] = [
    {
      value: `${data.doneCount} / ${data.totalCount}`,
      label: t('report.pdf.measurements.progress'),
    },
  ]
  if (options.savings && data.savingsTotal > 0) {
    cards.push({
      value: fmtCur(data.savingsTotal, cur),
      label: t('report.contents.savings'),
      color: ratingColor('good'),
    })
  }
  kit.kpiCards(cards, cards.length === 1 ? 1 : 2)
  kit.gap(6)

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.measurements'))
  } else if (variant === 'short') {
    writeFlatList(kit, t, num, cur, data.entries, options)
  } else {
    writeGrouped(kit, t, num, cur, data.groups, options)
  }

  // Offene Messungen (nur Lang + aktiviert).
  if (variant === 'long' && options.openMeasurements && data.open.length > 0) {
    kit.gap(8)
    kit.sectionTitle(t('report.contents.openMeasurements'))
    for (const o of data.open) {
      const title = t(`measurements.${o.id}.title`)
      const tag = o.available ? t('measurements.status.available') : t('measurements.status.soon')
      kit.body(`- ${title}  (${tag})`, { color: [120, 122, 128] })
    }
  }
}

/** Flache Liste erledigter Messungen (Kurzfassung). */
function writeFlatList(
  kit: PdfKit,
  t: TFunction,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  entries: MeasurementEntry[],
  options: ReportContentOptions,
): void {
  kit.sectionTitle(t('report.pdf.measurements.completed'))
  for (const e of entries) writeEntryRow(kit, t, num, cur, e, options)
}

/** Nach Gewerk gruppierte Liste mit Einordnung + Tipp (Langfassung). */
function writeGrouped(
  kit: PdfKit,
  t: TFunction,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  groups: MeasurementGroup[],
  options: ReportContentOptions,
): void {
  for (const g of groups) {
    kit.sectionTitle(t(`measurements.categories.${g.category}`))
    for (const e of g.entries) {
      writeEntryRow(kit, t, num, cur, e, options)
      const summary = t(`measurements.${e.id}.result.summary.${e.rating}`, { defaultValue: '' })
      if (summary) kit.subtle(summary, { indent: 14 })
      if (options.tips) {
        const tip = t(`measurements.${e.id}.result.tip.${e.rating}`, { defaultValue: '' })
        if (tip) kit.subtle(`${t('report.contents.tips')}: ${tip}`, { indent: 14 })
      }
      kit.gap(4)
    }
  }
}

/** Eine Mess-Zeile mit Rating-Punkt, Wert und optional Sparpotenzial-Tag. */
function writeEntryRow(
  kit: PdfKit,
  t: TFunction,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  options: ReportContentOptions,
): void {
  const title = t(`measurements.${e.id}.title`)
  const rating = t(`measurements.ratings.${e.rating}`)
  const value = `${fmtVal(e.primaryValue, e.unit, num)}`
  const tag =
    options.savings && e.yearlySaving && e.yearlySaving > 0
      ? `${t('report.contents.savings')} ${fmtCur(e.yearlySaving, cur)}`
      : rating
  kit.swatchRow(ratingColor(e.rating), title, value, { tag })
}
