import type { TFunction } from 'i18next'
import { PdfKit } from './pdf/pdfKit'
import { fmtDate, fmtNum, numberFmt, reportFileName } from './pdf/format'
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
}

export function generateReportPdf(args: GenerateReportArgs): ReportDocument {
  const { variant, sections, t, language, profile, measurements, monitoring } = args
  const kit = new PdfKit()
  const options = defaultContentOptions(variant)
  const objectName = profile.profileName?.trim() || undefined

  kit.headerBand({
    title: t('report.pdf.title'),
    subtitle: objectName,
    meta: sectionLine(t, sections),
    date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
  })

  // Nur bei mehreren Abschnitten braucht es Überschriften – bei einem einzelnen
  // Abschnitt wäre der Titel eine Wiederholung der Kopfzeile. Den Kopfbalken
  // zeichnen die Bausteine nie selbst, er steht bereits oben.
  const multi = countSections(sections) > 1

  if (sections.profile) {
    if (multi) kit.sectionTitle(t('report.pdf.section.profile'))
    writeProfile(kit, t, language, profile)
    kit.gap(8)
  }

  if (sections.measurements) {
    if (multi) kit.sectionTitle(t('report.pdf.section.measurements'))
    fillMeasurements(kit, { variant, options, t, language, data: measurements, objectName }, false)
    kit.gap(10)
  }

  if (sections.monitoring) {
    if (multi) kit.sectionTitle(t('report.pdf.section.monitoring'))
    fillMonitoring(kit, { variant, options, t, language, data: monitoring, objectName }, false)
  }

  kit.finalizeFooters(
    (n, total) => t('report.pdf.page', { n, total }),
    t('report.pdf.footnote'),
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
  if (s.profile) parts.push(t('report.pdf.section.profile'))
  if (s.measurements) parts.push(t('report.pdf.section.measurements'))
  if (s.monitoring) parts.push(t('report.pdf.section.monitoring'))
  return parts.join(' · ')
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
  kit.kvTable(rows)
}
