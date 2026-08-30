import type { TFunction } from 'i18next'
import {
  ratingColor,
  type PdfKit,
  type KpiCard,
  type ChecklistItem,
  type FindingCard,
} from './pdf/pdfKit'
import { numberFmt, currencyFmt, fmtVal, fmtCurRange, fmtDate } from './pdf/format'
import { roomLabel } from '@/features/measurements/rooms'
import type { MeasurementRating } from '@/features/measurements/types'
import type {
  MeasurementsReportData,
  MeasurementEntry,
  MeasurementGroup,
} from './measurementsReportData'

/**
 * Der Messungen-Abschnitt des Energieberichts. Wird von
 * {@link generateReportPdf} in ein bestehendes Dokument geschrieben.
 *
 * Aufbau: Kennzahlreihe → Prioritätentabelle über alle Ergebnisse → Befunde
 * nach Gewerk → offene Messungen. Die Tabelle beantwortet „was zuerst?", die
 * Karten „was heißt das und was tue ich?" – zwei verschiedene Fragen, die eine
 * einzelne Darstellung nicht beide gut beantwortet.
 */

export interface GenerateMeasurementsArgs {
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
  /** Empfehlungen der App, je Mess-Id (siehe generateReportPdf). */
  tipsByMeasurement?: Record<string, string[]>
}

/**
 * Dringlichkeit einer Bewertung – bestimmt die Reihenfolge der Übersicht.
 * Ein Bericht, der nach Katalog-Reihenfolge sortiert, verrät nicht, womit
 * anzufangen ist.
 */
const RATING_URGENCY: Record<MeasurementRating, number> = {
  high: 0,
  elevated: 1,
  medium: 2,
  good: 3,
}

/**
 * Schreibt den Messungen-Abschnitt in ein bestehendes Kit
 * (auch vom Gesamt-Bericht genutzt). `withHeader=false` lässt den Kopfbalken weg.
 */
export function fillMeasurements(
  kit: PdfKit,
  {
    t,
    language,
    data,
    objectName,
    summarized = false,
    tipsByMeasurement = {},
  }: GenerateMeasurementsArgs,
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

  if (!summarized) writeProgressCards(kit, t, cur, num, data)

  if (data.entries.length === 0) {
    kit.subtle(t('report.pdf.empty.measurements'))
    return
  }

  writeOverviewTable(kit, t, language, num, cur, data.entries)
  writeGrouped(kit, t, language, num, cur, data.groups, tipsByMeasurement)

  if (data.open.length > 0) {
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
  num: Intl.NumberFormat,
  data: MeasurementsReportData,
): void {
  const cards: KpiCard[] = [
    {
      value: `${data.doneCount} / ${data.totalCount}`,
      label: t('report.pdf.measurements.progress'),
    },
  ]
  // Die Summe erscheint als Spanne: Sie besteht aus lauter Einzelspannen, und
  // eine punktgenaue Kopfzahl darüber würde mehr behaupten als jede Karte
  // darunter hergibt.
  if (data.savingsTotal > 0) {
    cards.push({
      value: t('report.pdf.measurements.savingsApprox', {
        value: fmtCurRange(data.savingsRange, cur, num),
      }),
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

/**
 * Alle Ergebnisse in einer Tabelle, das Dringlichste zuerst.
 *
 * Die Karten weiter unten stehen nach Gewerk – gut zum Lesen, unbrauchbar zum
 * Priorisieren. Diese Tabelle ist die eine Stelle, an der sich mit einem Blick
 * beantworten lässt: Was ist auffällig, was bringt Geld, wann wurde gemessen?
 */
function writeOverviewTable(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  entries: MeasurementEntry[],
): void {
  const sorted = [...entries].sort(
    (a, b) =>
      RATING_URGENCY[a.rating] - RATING_URGENCY[b.rating] ||
      (b.yearlySaving ?? 0) - (a.yearlySaving ?? 0),
  )
  const anySaving = sorted.some((e) => (e.yearlySaving ?? 0) > 0)

  const headers = [
    t('report.pdf.measurements.colMeasurement'),
    t('report.pdf.measurements.colResult'),
    t('report.pdf.measurements.colRating'),
    t('report.pdf.measurements.colMeasuredAt'),
  ]
  if (anySaving) headers.push(t('report.pdf.measurements.colSaving'))

  const rows = sorted.map((e) => {
    const row = [
      t(`measurements.${e.id}.title`),
      fmtVal(e.primaryValue, e.unit, num),
      t(`measurements.ratings.${e.rating}`),
      e.measuredAt ? fmtDate(e.measuredAt, language) : '–',
    ]
    if (anySaving) row.push(e.savingRange ? fmtCurRange(e.savingRange, cur, num) : '–')
    return row
  })

  kit.subHead(t('report.pdf.measurements.overview'), { keepWith: 60 })
  kit.table(headers, rows, {
    // Der Name braucht den meisten Platz; die Zahlenspalten sind schmal und
    // stehen rechtsbündig, damit sich Beträge untereinander vergleichen lassen.
    widths: anySaving ? [2.5, 1.2, 1.1, 1.1, 1.1] : [2.8, 1.3, 1.2, 1.2],
    align: anySaving
      ? ['left', 'right', 'left', 'right', 'right']
      : ['left', 'right', 'left', 'right'],
  })
}

/** Nach Gewerk gruppierte Befunde mit Einordnung, Räumen und Tipp. */
function writeGrouped(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  groups: MeasurementGroup[],
  tipsByMeasurement: Record<string, string[]>,
): void {
  for (const g of groups) {
    const first = g.entries[0]
    // Der Gewerk-Titel muss den vollen ersten Block halten, Raum-Tabelle
    // eingeschlossen – sonst bleibt „Heizung" allein am Seitenende zurück.
    const keepWith = first
      ? entryBlockHeight(kit, t, language, num, cur, first, tipsByMeasurement)
      : 30
    kit.subHead(t(`measurements.categories.${g.category}`), { keepWith })
    for (const e of g.entries) writeEntryCard(kit, t, language, num, cur, e, tipsByMeasurement)
  }
}

/**
 * Ein Messergebnis als Karte. Einordnung und Tipp gehören mit in die Karte:
 * Vorher standen sie unterhalb der Trennlinie und damit optisch beim nächsten
 * Befund. Raumbezogene Messungen listen darunter ihre Einzelwerte – der
 * Kartenwert allein wäre einer von mehreren Räumen, ohne dass das dastünde.
 */
function writeEntryCard(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  tipsByMeasurement: Record<string, string[]>,
): void {
  const card = buildEntryCard(t, language, num, cur, e, tipsByMeasurement)
  const withRooms = e.rooms.length > 1
  // Karte und Raum-Tabelle gehören zusammen: Landet die Tabelle allein auf der
  // Folgeseite, steht dort eine Liste von Werten ohne die Messung, zu der sie
  // gehört.
  if (withRooms) kit.ensure(entryBlockHeight(kit, t, language, num, cur, e, tipsByMeasurement))

  kit.findingCard(card)
  if (!withRooms) return

  kit.table(
    [
      t('report.pdf.measurements.colRoom'),
      t('report.pdf.measurements.colResult'),
      t('report.pdf.measurements.colRating'),
    ],
    e.rooms.map((r) => [
      roomLabel(t, r.room),
      fmtVal(r.value, r.unit, num),
      t(`measurements.ratings.${r.rating}`),
    ]),
    { widths: [2.6, 1.2, 1.2], align: ['left', 'right', 'right'] },
  )
}

/** Höhe von Karte plus zugehöriger Raum-Tabelle, ohne etwas zu zeichnen. */
function entryBlockHeight(
  kit: PdfKit,
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  tipsByMeasurement: Record<string, string[]>,
): number {
  const card = kit.measureFindingCard(buildEntryCard(t, language, num, cur, e, tipsByMeasurement))
  return card + 8 + (e.rooms.length > 1 ? kit.measureTable(e.rooms.length) : 0)
}

/** Baut die Kartendaten eines Messergebnisses – ohne sie zu zeichnen. */
function buildEntryCard(
  t: TFunction,
  language: string,
  num: Intl.NumberFormat,
  cur: Intl.NumberFormat,
  e: MeasurementEntry,
  tipsByMeasurement: Record<string, string[]>,
): FindingCard {
  const saving = e.savingRange
    ? t('report.pdf.measurements.savingsValue', {
        value: fmtCurRange(e.savingRange, cur, num),
      })
    : undefined

  return {
    color: ratingColor(e.rating),
    title: t(`measurements.${e.id}.title`),
    value: fmtVal(e.primaryValue, e.unit, num),
    ratingLabel: t(`measurements.ratings.${e.rating}`),
    noteLabel: saving,
    meta: entryMeta(t, language, e),
    summary: t(`measurements.${e.id}.result.summary.${e.rating}`, { defaultValue: '' }) || undefined,
    tips: tipsByMeasurement[e.id]?.length ? tipsByMeasurement[e.id] : undefined,
    tipLabel: t('report.pdf.measurements.tips'),
  }
}

/**
 * Herkunftszeile einer Karte: wo und wann gemessen wurde. Bei genau einem
 * geprüften Raum steht dessen Name; bei mehreren die Anzahl, weil die Liste
 * darunter die Namen ohnehin einzeln nennt.
 */
function entryMeta(t: TFunction, language: string, e: MeasurementEntry): string | undefined {
  const parts: string[] = []
  if (e.rooms.length === 1) parts.push(roomLabel(t, e.rooms[0].room))
  else if (e.rooms.length > 1) parts.push(t('report.pdf.measurements.rooms', { count: e.rooms.length }))
  if (e.measuredAt) {
    parts.push(t('report.pdf.measurements.measuredOn', { date: fmtDate(e.measuredAt, language) }))
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}
