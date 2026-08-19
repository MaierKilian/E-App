import type { TFunction } from 'i18next'
import {
  ratingColor,
  type PdfKit,
  type KpiCard,
  type ChecklistItem,
  type FindingCard,
} from './pdf/pdfKit'
import { numberFmt, currencyFmt, fmtVal, fmtCur, fmtDate } from './pdf/format'
import type { ReportVariant, ReportContentOptions } from './reportTypes'
import type {
  MeasurementsReportData,
  MeasurementEntry,
  MeasurementGroup,
} from './measurementsReportData'

/**
 * Der Messungen-Abschnitt des Energieberichts. Wird von
 * {@link generateReportPdf} in ein bestehendes Dokument geschrieben.
 */

export interface GenerateMeasurementsArgs {
  variant: ReportVariant
  options: ReportContentOptions
  t: TFunction
  language: string
  data: MeasurementsReportData
  /** Objektname (Profilname) für Kopfzeile und Dateiname. */
  objectName?: string
  /**
   * Die Zusammenfassung oben trägt Sparpotenzial und Handlungsbedarf bereits.
   * Dann entfällt die Kennzahlreihe hier – zweimal dieselbe Zahl auf einer
   * halben Seite liest niemand als Betonung, sondern als Versehen.
   */
  summarized?: boolean
}

/**
 * Schreibt den Messungen-Abschnitt in ein bestehendes Kit
 * (auch vom Gesamt-Bericht genutzt). `withHeader=false` lässt den Kopfbalken weg.
 */
export function fillMeasurements(
  kit: PdfKit,
  { variant, options, t, language, data, objectName, summarized = false }: GenerateMeasurementsArgs,
  withHeader = true,
): void {
  const num = numberFmt(language, 1)
  const cur = currencyFmt(language)

  if (withHeader) {
    kit.masthead({
      title: t('report.pdf.measurements.title'),
      subtitle: objectName,
      meta: t('report.pdf.measurements.subtitle'),
      date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
    })
  }

  if (!summarized) writeProgressCards(kit, t, cur, data, options)

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.measurements'))
  } else if (variant === 'short') {
    writeFlatList(kit, t, num, cur, data.entries, options)
  } else {
    writeGrouped(kit, t, num, cur, data.groups, options)
  }

  // Offene Messungen (nur Lang + aktiviert).
  if (variant === 'long' && options.openMeasurements && data.open.length > 0) {
    kit.subHead(t('report.pdf.measurements.openMeasurements'), { keepWith: 44 })
    const items: ChecklistItem[] = data.open.map((o) => ({
      title: t(`measurements.${o.id}.title`),
      tag: o.available ? t('measurements.status.available') : t('measurements.status.soon'),
    }))
    kit.checklist(items)
  }
}

/**
 * Kennzahlreihe des Messungen-Abschnitts. Nur nötig, wo keine Zusammenfassung
 * über dem Bericht steht – etwa im Bericht, der allein aus Messungen besteht.
 */
function writeProgressCards(
  kit: PdfKit,
  t: TFunction,
  cur: Intl.NumberFormat,
  data: MeasurementsReportData,
  options: ReportContentOptions,
): void {
  const cards: KpiCard[] = [
    {
      value: `${data.doneCount} / ${data.totalCount}`,
      label: t('report.pdf.measurements.progress'),
    },
  ]
  if (options.savings && data.savingsTotal > 0) {
    cards.push({
      value: fmtCur(data.savingsTotal, cur),
      label: t('report.pdf.measurements.savings'),
      color: ratingColor('good'),
    })
  }
  // Wie viele Befunde etwas verlangen. „Offene Messungen" stünde hier zwar
  // auch, wäre aus „5 / 9" aber schon ablesbar – diese Zahl steht nirgends
  // sonst und ist die eigentliche Frage an den Bericht.
  const actionNeeded = data.entries.filter(
    (e) => e.rating === 'elevated' || e.rating === 'high',
  ).length
  if (data.entries.length > 0) {
    cards.push({
      value: String(actionNeeded),
      label: t('report.pdf.measurements.actionNeeded'),
      color: actionNeeded > 0 ? ratingColor('elevated') : undefined,
    })
  }
  kit.kpiCards(cards, cards.length)
  kit.gap(4)
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
  const first = entries[0]
  const keepWith = first
    ? kit.measureFindingCard(buildEntryCard(t, num, cur, first, options, false)) + 8
    : 30
  kit.subHead(t('report.pdf.measurements.completed'), { keepWith })
  for (const e of entries) writeEntryCard(kit, t, num, cur, e, options, false)
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
    const first = g.entries[0]
    const keepWith = first
      ? kit.measureFindingCard(buildEntryCard(t, num, cur, first, options, true)) + 8
      : 30
    kit.subHead(t(`measurements.categories.${g.category}`), { keepWith })
    for (const e of g.entries) writeEntryCard(kit, t, num, cur, e, options, true)
  }
}

/**
 * Ein Messergebnis als Karte. Einordnung und Tipp gehören mit in die Karte:
 * Vorher standen sie unterhalb der Trennlinie und damit optisch beim nächsten
 * Befund.
 */
function writeEntryCard(
  kit: PdfKit,
  t: TFunction,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  options: ReportContentOptions,
  detailed: boolean,
): void {
  kit.findingCard(buildEntryCard(t, num, cur, e, options, detailed))
}

/** Baut die Kartendaten eines Messergebnisses – ohne sie zu zeichnen. */
function buildEntryCard(
  t: TFunction,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  options: ReportContentOptions,
  detailed: boolean,
): FindingCard {
  const saving =
    options.savings && e.yearlySaving && e.yearlySaving > 0
      ? t('report.pdf.measurements.savingsValue', { value: fmtCur(e.yearlySaving, cur) })
      : undefined
  const summary = detailed
    ? t(`measurements.${e.id}.result.summary.${e.rating}`, { defaultValue: '' })
    : ''
  const tip =
    detailed && options.tips
      ? t(`measurements.${e.id}.result.tip.${e.rating}`, { defaultValue: '' })
      : ''

  return {
    color: ratingColor(e.rating),
    title: t(`measurements.${e.id}.title`),
    value: fmtVal(e.primaryValue, e.unit, num),
    ratingLabel: t(`measurements.ratings.${e.rating}`),
    noteLabel: saving,
    summary: summary || undefined,
    tip: tip || undefined,
    tipLabel: t('report.pdf.measurements.tips'),
  }
}
