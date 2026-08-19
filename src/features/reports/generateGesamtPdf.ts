import type { TFunction } from 'i18next'
import { PdfKit } from './pdf/pdfKit'
import { fmtDate, fmtNum, numberFmt, reportFileName } from './pdf/format'
import type { ReportVariant, ReportContentOptions } from './reportTypes'
import { fillMeasurements } from './generateMeasurementsPdf'
import { fillMonitoring } from './generateMonitoringPdf'
import type { MeasurementsReportData } from './measurementsReportData'
import type { MonitoringReportData } from './monitoringReportData'

/**
 * Erzeugt den Gesamt-Bericht: Profil-Kopf + Messungen-Abschnitt +
 * Monitoring-Abschnitt (jeweils gemäß gewählter Variante/Optionen).
 */

/** Kompakte Profil-Kennzahlen für den Gesamt-Kopf. */
export interface ProfileSummary {
  profileName?: string
  buildingType?: string
  livingArea?: number
  buildingYear?: number
  personsCount?: number
}

export interface GenerateGesamtArgs {
  variant: ReportVariant
  options: ReportContentOptions
  t: TFunction
  language: string
  profile: ProfileSummary
  measurements: MeasurementsReportData
  monitoring: MonitoringReportData
}

export function generateGesamtPdf(args: GenerateGesamtArgs): void {
  const { variant, options, t, language, profile, measurements, monitoring } = args
  const kit = new PdfKit()

  const objectName = profile.profileName?.trim() || undefined

  kit.headerBand({
    title: t('report.pdf.total.title'),
    subtitle: objectName,
    meta: t('report.pdf.total.subtitle'),
    date: t('report.pdf.dateLine', { date: fmtDate(new Date().toISOString(), language) }),
  })

  writeProfileHead(kit, t, language, profile)

  kit.gap(8)
  kit.sectionTitle(t('report.pdf.section.measurements'))
  fillMeasurements(kit, { variant, options, t, language, data: measurements, objectName }, false)

  kit.gap(10)
  kit.sectionTitle(t('report.pdf.section.monitoring'))
  fillMonitoring(kit, { variant, options, t, language, data: monitoring, objectName }, false)

  kit.finalizeFooters(
    (n, total) => t('report.pdf.page', { n, total }),
    t('report.pdf.footnote'),
  )
  kit.save(reportFileName(t('report.types.total.title'), objectName))
}

/** Kurzer Profilkopf als Label/Wert-Tabelle. */
function writeProfileHead(
  kit: PdfKit,
  t: TFunction,
  language: string,
  p: ProfileSummary,
): void {
  const num = numberFmt(language)
  kit.sectionTitle(t('report.pdf.total.profile'))
  const L = (k: string) => t(`onboarding.step8.labels.${k}`)
  const rows: [string, string][] = []
  if (p.buildingType) rows.push([L('buildingType'), t(`onboarding.step2.${p.buildingType}`)])
  if (p.livingArea !== undefined) rows.push([L('livingArea'), `${fmtNum(p.livingArea, num)} m²`])
  if (p.buildingYear !== undefined) rows.push([L('buildingYear'), fmtNum(p.buildingYear, num)])
  if (p.personsCount !== undefined) rows.push([L('persons'), fmtNum(p.personsCount, num)])
  kit.kvTable(rows)
}
