import type { TFunction } from 'i18next'
import { PdfKit, ratingColor, type HeroStat, type TocRow, type CostRow } from './pdf/pdfKit'
import { currencyFmt, fmtCur, fmtCurRange, fmtDate, fmtDateShort, numberFmt, reportFileName } from './pdf/format'
import type { ReportDocument } from './pdf/deliver'
import type { ReportSections } from './reportTypes'
import { fillMeasurements } from './generateMeasurementsPdf'
import { fillProfile } from './generateProfilePdf'
import { fillActionPlan } from './generateActionPlanPdf'
import { fillMonitoring } from './generateMonitoringPdf'
import type { MeasurementsReportData } from './measurementsReportData'
import type { MonitoringReportData } from './monitoringReportData'
import type { OnboardingData } from '@/types'
import type { Tip } from '@/features/tips/buildTips'

/**
 * Erzeugt den Energiebericht aus den gewählten Abschnitten.
 *
 * Der Bericht ist die Summe seiner Abschnitte – Messungen und Monitoring – und
 * nicht einer von mehreren Berichtstypen. Jeder Abschnitt zeigt alles, was er
 * hat; eine Kurzfassung, die Ergebnisse weglässt, beantwortet genau die Fragen
 * nicht, wegen derer ein Bericht weitergegeben wird.
 *
 * Jedes Kapitel beginnt auf einer neuen Seite. Sonst hängt der Anfang eines
 * Kapitels davon ab, wie lang das vorherige zufällig geworden ist – und die
 * Zusammenfassung teilt sich die erste Seite mit dem ersten Befund.
 */

export interface GenerateReportArgs {
  sections: ReportSections
  t: TFunction
  language: string
  /** Objektname (Profilname) für Kopfzeile, Fußzeile und Dateiname. */
  objectName?: string
  measurements: MeasurementsReportData
  monitoring: MonitoringReportData
  /**
   * Das Profil für den Steckbrief, der den Bericht eröffnet.
   *
   * Kein wählbarer Abschnitt: Ein Bericht ohne sein Objekt ist kein Bericht,
   * sondern eine Zahlenliste. Deshalb steht er auch nicht in
   * {@link ReportSections}.
   */
  profile: OnboardingData
  /**
   * Die **offenen** Empfehlungen in der Reihenfolge der App – Grundlage des
   * Handlungsplans. Erledigte und ausgeblendete sind schon heraus; der Bericht
   * sortiert nicht selbst, sonst ordnete er anders als der Bildschirm.
   */
  openTips: Tip[]
  /**
   * Die fertig formulierten Empfehlungen der App, je Messung gebündelt.
   * Der Bericht hatte bis dahin ein eigenes, zweites Tipp-System, das nur für
   * zwei der neun Messungen überhaupt Text hatte – bei den übrigen sieben blieb
   * der Tipp-Block leer, während die App längst eine Empfehlung dazu kannte.
   */
  tipsByMeasurement?: Record<string, string[]>
}

export function generateReportPdf(args: GenerateReportArgs): ReportDocument {
  const { sections, t, language, measurements, monitoring, tipsByMeasurement, profile, openTips } = args
  const kit = new PdfKit()
  const objectName = args.objectName?.trim() || undefined

  // --- Deckseite: Titel, die Zahlen, und was im Bericht steht.
  kit.coverHead({
    title: t('report.pdf.title'),
    subtitle: objectName,
    meta: sectionLine(t, sections),
    date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
  })

  const summarized = writeSummary(kit, t, language, sections, measurements, monitoring)

  // Wohin die Jahreskosten gehen. Die Summe steht als Kennzahl darüber, ihre
  // Aufteilung stand bisher nirgends auf einen Blick – man musste sie sich aus
  // den Träger-Kapiteln zusammensuchen.
  if (sections.monitoring) {
    kit.gap(26)
    kit.costBars(t('report.pdf.cover.costs'), costRows(t, language, monitoring))
  }

  kit.gap(30)
  const total = countSections(sections)
  const tocRows = buildToc(t, language, sections, measurements, monitoring, openTips.length)
  const tocSlots = kit.coverToc(t('report.pdf.cover.contents'), tocRows)
  kit.coverFoot(t('report.pdf.cover.basis'), basisLines(t, language, sections, measurements, monitoring))

  // Nummerierte Abschnitte machen die Gliederung im Kopf schon vor dem Lesen
  // sichtbar – und verraten, wie viel noch kommt. Jeder Abschnitt beginnt jetzt
  // auf einer eigenen Seite, auch wenn es nur einer ist: Die Deckseite ist eine
  // Deckseite, kein Anfang, dem der erste Befund hinterherrutscht.
  let index = 0
  const startPages: number[] = []
  /** Kapitel-Überschrift auf einer frischen Seite; merkt sich die Seitenzahl. */
  const chapter = (titleKey: string) => {
    kit.newPage()
    startPages.push(kit.pageNumber)
    kit.sectionHeader(t(titleKey), {
      eyebrow: total > 1 ? t('report.pdf.sectionCount', { n: ++index, total }) : undefined,
      keepWith: 70,
    })
  }

  // Der Steckbrief eröffnet, weil alles danach sich auf ihn bezieht.
  chapter('report.pdf.section.profile')
  fillProfile(kit, { t, language, data: profile })

  if (sections.measurements) {
    chapter('report.pdf.section.measurements')
    fillMeasurements(
      kit,
      { t, language, data: measurements, objectName, summarized, tipsByMeasurement },
      false,
    )
  }

  if (sections.monitoring) {
    chapter('report.pdf.section.monitoring')
    fillMonitoring(kit, { t, language, data: monitoring, objectName }, false)
  }

  // Der Handlungsplan steht am Ende: Er beantwortet „und jetzt?", und diese
  // Frage stellt sich erst, wenn die Befunde gelesen sind.
  chapter('report.pdf.section.actionPlan')
  fillActionPlan(kit, { t, language, tips: openTips, goals: profile.goals })

  // Erst jetzt stehen die Seitenzahlen fest – sie wandern zurück auf Seite 1.
  kit.fillTocPages(
    tocSlots,
    startPages.map((n) => t('report.pdf.cover.pageNo', { n })),
  )

  kit.finalizeFooters(
    (n, total) => t('report.pdf.page', { n, total }),
    t('report.pdf.footnote'),
    { left: objectName ?? t('report.pdf.title'), right: sectionLine(t, sections) },
  )
  return { doc: kit.doc, fileName: reportFileName(t('report.pdf.fileLabel'), objectName) }
}

/**
 * Anzahl der Kapitel. Steckbrief und Handlungsplan sind immer dabei und werden
 * deshalb fest mitgezählt – beide sind keine wählbaren Abschnitte (siehe
 * `ReportSections`).
 */
function countSections(s: ReportSections): number {
  return 2 + Number(s.measurements) + Number(s.monitoring)
}

/** Kopfzeile: welche Abschnitte dieser Bericht enthält. */
function sectionLine(t: TFunction, s: ReportSections): string {
  const parts: string[] = []
  if (s.measurements) parts.push(t('report.pdf.section.measurements'))
  if (s.monitoring) parts.push(t('report.pdf.section.monitoring'))
  return parts.join(' · ')
}

/**
 * Die Jahreskosten je Energieträger für den Balkenvergleich der Deckseite.
 * Träger ohne hinterlegten Preis liefern keinen Betrag und bleiben draußen –
 * ein Balken der Länge null behauptet, dort falle nichts an.
 */
function costRows(
  t: TFunction,
  language: string,
  monitoring: MonitoringReportData,
): CostRow[] {
  const cur = currencyFmt(language)
  const num = numberFmt(language)
  const withCost = monitoring.entries.filter(
    (e): e is typeof e & { costYear: number } =>
      typeof e.costYear === 'number' && Number.isFinite(e.costYear) && e.costYear > 0,
  )
  const sum = withCost.reduce((a, e) => a + e.costYear, 0)
  if (sum <= 0) return []

  return withCost.map((e) => ({
    label: t(`monitoring.energyTypes.${e.type}`),
    value: e.costYear,
    valueLabel: fmtCur(e.costYear, cur),
    shareLabel: `${num.format(Math.round((e.costYear / sum) * 100))} %`,
  }))
}

/**
 * Die Inhaltsübersicht der Deckseite: je Abschnitt eine Zeile mit dem, was ihn
 * ausmacht. Sie beantwortet die Frage, die vor dem Umblättern kommt – „was
 * erwartet mich, und wo steht es?" – und füllt die Deckseite mit Orientierung
 * statt mit Weißraum.
 */
function buildToc(
  t: TFunction,
  language: string,
  sections: ReportSections,
  measurements: MeasurementsReportData,
  monitoring: MonitoringReportData,
  openTips: number,
): TocRow[] {
  const rows: TocRow[] = []

  // Immer dabei, deshalb ohne Bedingung und an erster Stelle.
  rows.push({ n: 1, title: t('report.pdf.section.profile') })

  if (sections.measurements) {
    const parts = [
      t('report.pdf.cover.metaChecks', {
        done: measurements.doneCount,
        total: measurements.totalCount,
      }),
    ]
    const action = measurements.entries.filter(
      (e) => e.rating === 'elevated' || e.rating === 'high',
    ).length
    // Nur nennen, was etwas verlangt. „0 Befunde mit Handlungsbedarf" ist keine
    // Information, sondern eine Verneinung – die steht schon in der Kennzahl.
    if (action > 0) parts.push(t('report.pdf.cover.metaAction', { count: action }))
    rows.push({ n: rows.length + 1, title: t('report.pdf.section.measurements'), meta: parts.join(' · ') })
  }

  if (sections.monitoring) {
    const parts = [t('report.pdf.cover.metaCarriers', { count: monitoring.entries.length })]
    if (monitoring.readingCount > 0) {
      parts.push(t('report.pdf.cover.metaReadings', { count: monitoring.readingCount }))
    }
    const period = periodLabel(language, monitoring.from, monitoring.to)
    if (period) parts.push(period)
    rows.push({ n: rows.length + 1, title: t('report.pdf.section.monitoring'), meta: parts.join(' · ') })
  }

  // Wie der Steckbrief immer dabei, deshalb ohne Bedingung.
  rows.push({
    n: rows.length + 1,
    title: t('report.pdf.section.actionPlan'),
    meta: openTips > 0 ? t('report.pdf.cover.metaActions', { count: openTips }) : undefined,
  })

  return rows
}

/** Zeitraum als „01.09.2025 – 25.08.2026"; leer, wenn kein Rand bekannt ist. */
function periodLabel(language: string, from?: string, to?: string): string | undefined {
  if (!from || !to) return undefined
  return `${fmtDateShort(from, language)} – ${fmtDateShort(to, language)}`
}

/**
 * Der Fußblock der Deckseite: worauf die Zahlen beruhen.
 *
 * Die zweite Zeile ist die wichtigere. Ein Bericht, den jemand einem Dritten
 * vorlegt, muss selbst sagen, welche seiner Zahlen gemessen und welche
 * hochgerechnet sind – sonst tut es der Leser, und zwar im Zweifel falsch.
 */
function basisLines(
  t: TFunction,
  language: string,
  sections: ReportSections,
  measurements: MeasurementsReportData,
  monitoring: MonitoringReportData,
): string[] {
  const parts: string[] = []

  if (sections.measurements) {
    const dates = measurements.entries
      .map((e) => e.measuredAt)
      .filter((d): d is string => Boolean(d))
      .sort()
    if (dates.length > 0) {
      parts.push(
        t('report.pdf.cover.basisMeasurements', {
          period: periodLabel(language, dates[0], dates[dates.length - 1]) ?? '',
        }),
      )
    }
  }

  if (sections.monitoring && monitoring.readingCount > 0) {
    parts.push(
      t('report.pdf.cover.basisReadings', {
        period: periodLabel(language, monitoring.from, monitoring.to) ?? '',
      }),
    )
  }

  const lines: string[] = []
  if (parts.length > 0) lines.push(parts.join(' · '))
  lines.push(t('report.pdf.cover.basisNote'))
  return lines
}

/**
 * „Auf einen Blick": die drei Zahlen, wegen derer jemand den Bericht öffnet –
 * was die Energie im Jahr kostet, was davon vermeidbar ist, und wie viele
 * Befunde etwas verlangen. Sie standen bisher verstreut über drei Abschnitte,
 * die Jahreskosten nur als Summenzeile einer Tabelle.
 *
 * Der Block entfällt, wenn keine dieser Zahlen vorliegt – eine Zusammenfassung
 * ohne Inhalt ist schlechter als keine.
 */
function writeSummary(
  kit: PdfKit,
  t: TFunction,
  language: string,
  sections: ReportSections,
  measurements: MeasurementsReportData,
  monitoring: MonitoringReportData,
): boolean {
  const cur = currencyFmt(language)
  const stats: HeroStat[] = []

  const costs = sections.monitoring
    ? monitoring.entries.map((e) => e.costYear).filter((c): c is number => c !== undefined)
    : []
  if (costs.length > 0) {
    stats.push({
      value: fmtCur(costs.reduce((a, b) => a + b, 0), cur),
      label: t('report.pdf.summary.costYear'),
      sub: t('report.pdf.summary.carrierCount', { count: costs.length }),
    })
  }

  // Als Spanne, wie in den Karten und der Tabelle des Messungs-Kapitels. Eine
  // punktgenaue Kopfzahl auf der Deckseite würde dem widersprechen, was zwei
  // Seiten später steht.
  if (sections.measurements && measurements.savingsTotal > 0) {
    stats.push({
      value: t('report.pdf.measurements.savingsApprox', {
        value: fmtCurRange(measurements.savingsRange, cur, numberFmt(language)),
      }),
      label: t('report.pdf.summary.savings'),
      sub: t('report.pdf.summary.savingsSub'),
      color: ratingColor('good'),
    })
  }

  const coversMeasurements = sections.measurements && measurements.entries.length > 0
  if (coversMeasurements) {
    const needsAction = measurements.entries.filter(
      (e) => e.rating === 'elevated' || e.rating === 'high',
    ).length
    stats.push({
      value: String(needsAction),
      label: t('report.pdf.summary.actionNeeded'),
      sub: t('report.pdf.summary.actionSub', {
        done: measurements.doneCount,
        total: measurements.totalCount,
      }),
      color: needsAction > 0 ? ratingColor('elevated') : undefined,
    })
  }

  if (stats.length === 0) return false
  kit.summaryPanel(t('report.pdf.summary.title'), stats, undefined, true)
  kit.gap(4)
  return coversMeasurements
}
