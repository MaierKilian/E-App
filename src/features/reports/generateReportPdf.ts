import type { TFunction } from 'i18next'
import { PdfKit, ratingColor, type HeroStat } from './pdf/pdfKit'
import { currencyFmt, fmtCur, fmtDate, fmtNum, numberFmt, reportFileName } from './pdf/format'
import type { ReportDocument } from './pdf/deliver'
import type { ReportSections, ReportVariant } from './reportTypes'
import { defaultContentOptions } from './reportTypes'
import { fillMeasurements } from './generateMeasurementsPdf'
import { fillMonitoring } from './generateMonitoringPdf'
import type { MeasurementsReportData } from './measurementsReportData'
import type { MonitoringReportData } from './monitoringReportData'

/**
 * Erzeugt den Energiebericht aus den gewählten Abschnitten.
 *
 * Der Bericht ist die Summe seiner Abschnitte – Profil, Messungen, Monitoring –
 * und nicht einer von mehreren Berichtstypen. Welche Bausteine ein Abschnitt
 * enthält, ergibt sich allein aus `variant`; einzelne Inhalte werden nicht
 * mehr durchgereicht.
 */

/** Kompakte Profil-Kennzahlen für den Profil-Abschnitt. */
export interface ProfileSummary {
  profileName?: string
  buildingType?: string
  livingArea?: number
  buildingYear?: number
  personsCount?: number
}

export interface GenerateReportArgs {
  variant: ReportVariant
  sections: ReportSections
  t: TFunction
  language: string
  profile: ProfileSummary
  measurements: MeasurementsReportData
  monitoring: MonitoringReportData
  /**
   * Die fertig formulierten Empfehlungen der App, je Messung gebündelt.
   * Der Bericht hatte bis dahin ein eigenes, zweites Tipp-System, das nur für
   * zwei der neun Messungen überhaupt Text hatte – bei den übrigen sieben blieb
   * der Tipp-Block leer, während die App längst eine Empfehlung dazu kannte.
   */
  tipsByMeasurement?: Record<string, string[]>
}

export function generateReportPdf(args: GenerateReportArgs): ReportDocument {
  const { variant, sections, t, language, profile, measurements, monitoring, tipsByMeasurement } =
    args
  const kit = new PdfKit()
  const options = defaultContentOptions(variant)
  const objectName = profile.profileName?.trim() || undefined

  kit.masthead({
    title: t('report.pdf.title'),
    subtitle: objectName,
    meta: sectionLine(t, sections),
    date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
  })

  const summarized = writeSummary(kit, t, language, sections, measurements, monitoring)

  // Nur bei mehreren Abschnitten braucht es Überschriften – bei einem einzelnen
  // Abschnitt wäre der Titel eine Wiederholung der Kopfzeile. Den Kopfbalken
  // zeichnen die Bausteine nie selbst, er steht bereits oben.
  const total = countSections(sections)
  const multi = total > 1
  // Nummerierte Abschnitte machen die Gliederung im Kopf schon vor dem Lesen
  // sichtbar – und verraten, wie viel noch kommt.
  let index = 0
  const eyebrow = () =>
    t('report.pdf.sectionCount', { n: ++index, total })

  if (sections.measurements) {
    if (multi) kit.sectionHeader(t('report.pdf.section.measurements'), { eyebrow: eyebrow(), keepWith: 70 })
    fillMeasurements(
      kit,
      { variant, options, t, language, data: measurements, objectName, summarized, tipsByMeasurement },
      false,
    )
  }

  if (sections.monitoring) {
    if (multi) kit.sectionHeader(t('report.pdf.section.monitoring'), { eyebrow: eyebrow(), keepWith: 70 })
    fillMonitoring(kit, { variant, options, t, language, data: monitoring, objectName }, false)
  }

  // Das Profil steht zuletzt: es sind Stammdaten, keine Aussage. Vorne
  // eröffnete es den Bericht mit Baujahr und Wohnfläche.
  if (sections.profile) {
    if (multi) kit.sectionHeader(t('report.pdf.section.profile'), { eyebrow: eyebrow(), keepWith: 60 })
    writeProfile(kit, t, language, profile)
  }

  kit.finalizeFooters(
    (n, total) => t('report.pdf.page', { n, total }),
    t('report.pdf.footnote'),
    { left: objectName ?? t('report.pdf.title'), right: sectionLine(t, sections) },
  )
  return { doc: kit.doc, fileName: reportFileName(t('report.pdf.fileLabel'), objectName) }
}

/** Anzahl aktiver Abschnitte. */
function countSections(s: ReportSections): number {
  return Number(s.profile) + Number(s.measurements) + Number(s.monitoring)
}

/** Kopfzeile: welche Abschnitte dieser Bericht enthält. */
function sectionLine(t: TFunction, s: ReportSections): string {
  const parts: string[] = []
  if (s.measurements) parts.push(t('report.pdf.section.measurements'))
  if (s.monitoring) parts.push(t('report.pdf.section.monitoring'))
  if (s.profile) parts.push(t('report.pdf.section.profile'))
  return parts.join(' · ')
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

  if (sections.measurements && measurements.savingsTotal > 0) {
    stats.push({
      value: fmtCur(measurements.savingsTotal, cur),
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
  kit.summaryPanel(t('report.pdf.summary.title'), stats)
  kit.gap(4)
  return coversMeasurements
}

/** Profil-Abschnitt als Label/Wert-Tabelle. */
function writeProfile(kit: PdfKit, t: TFunction, language: string, p: ProfileSummary): void {
  const num = numberFmt(language)
  const L = (k: string) => t(`onboarding.step8.labels.${k}`)
  const rows: [string, string][] = []
  if (p.buildingType) rows.push([L('buildingType'), t(`onboarding.step2.${p.buildingType}`)])
  if (p.livingArea !== undefined) rows.push([L('livingArea'), `${fmtNum(p.livingArea, num)} m²`])
  // Jahreszahl ohne Tausendertrennzeichen – „1.978" wäre schlicht falsch.
  if (p.buildingYear !== undefined) rows.push([L('buildingYear'), String(p.buildingYear)])
  if (p.personsCount !== undefined) rows.push([L('persons'), fmtNum(p.personsCount, num)])
  // Ohne Angaben bliebe unter der Überschrift nichts stehen – das liest sich
  // wie ein abgeschnittener Bericht, nicht wie ein leeres Profil.
  if (rows.length === 0) {
    kit.subtle(t('report.pdf.empty.profile'))
    return
  }
  kit.kvTable(rows)
}
