import { jsPDF } from 'jspdf'
import type { TFunction } from 'i18next'
import type {
  ReportData,
  ReportMeasurement,
  ReportMonitoringEntry,
  ReportProfileLong,
  ReportProfileShort,
} from './reportData'

/**
 * Erzeugt einen PDF-Energiebericht (Kurz- oder Langfassung) und löst den
 * Download aus. Layout mit Kopf, Abschnitten (Profil/Messungen/Monitoring),
 * Trennlinien, Seitenzahlen und automatischem Seitenumbruch.
 *
 * Hinweis Schrift: der jsPDF-Standardfont (Helvetica) ist Latin-1. Unicode-
 * Tiefstellungen (z. B. „CO₂") werden über toLatin1() zu „CO2" normalisiert;
 * gängige Sonderzeichen (m²/m³/°C/€) bleiben erhalten.
 */

export type ReportVariant = 'short' | 'long'

export interface GenerateReportArgs {
  variant: ReportVariant
  t: TFunction
  language: string
  data: ReportData
}

// --- Layout-Konstanten (mm) ---
const MARGIN_X = 18
const MARGIN_TOP = 20
const MARGIN_BOTTOM = 18
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN_X * 2
const LINE_H = 6

/** Ersetzt Unicode-Tiefstellungen ₀–₉ durch normale Ziffern (Latin-1-fest). */
export function toLatin1(input: string): string {
  const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
  return input.replace(/[₀-₉]/g, (ch) => String(SUBSCRIPTS.indexOf(ch)))
}

/** Cursor-Zustand für den fortlaufenden Schreibvorgang. */
interface Cursor {
  doc: jsPDF
  y: number
}

/** Beginnt bei Bedarf eine neue Seite, wenn der nächste Block nicht passt. */
function ensureSpace(c: Cursor, needed: number): void {
  if (c.y + needed > PAGE_H - MARGIN_BOTTOM) {
    c.doc.addPage()
    c.y = MARGIN_TOP
  }
}

/** Schreibt eine oder mehrere Zeilen Text (mit Umbruch) und rückt den Cursor vor. */
function writeText(
  c: Cursor,
  text: string,
  opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {},
): void {
  const { size = 10, bold = false, color = [40, 40, 40], indent = 0 } = opts
  c.doc.setFont('helvetica', bold ? 'bold' : 'normal')
  c.doc.setFontSize(size)
  c.doc.setTextColor(color[0], color[1], color[2])
  const lines = c.doc.splitTextToSize(toLatin1(text), CONTENT_W - indent) as string[]
  for (const line of lines) {
    ensureSpace(c, LINE_H)
    c.doc.text(line, MARGIN_X + indent, c.y)
    c.y += LINE_H
  }
}

/** Schreibt eine „Label: Wert"-Zeile. */
function writeField(c: Cursor, label: string, value: string): void {
  writeText(c, `${label}: ${value}`)
}

/** Zeichnet einen Abschnittstitel mit Trennlinie darüber. */
function writeSectionTitle(c: Cursor, title: string): void {
  ensureSpace(c, LINE_H * 2)
  c.y += 2
  c.doc.setDrawColor(210, 210, 210)
  c.doc.line(MARGIN_X, c.y, PAGE_W - MARGIN_X, c.y)
  c.y += LINE_H
  writeText(c, title, { size: 13, bold: true, color: [20, 20, 20] })
  c.y += 1
}

// --- Formatierungs-Helfer ---

function makeNumberFmt(language: string, digits = 0): Intl.NumberFormat {
  return new Intl.NumberFormat(language, { maximumFractionDigits: digits })
}

function fmtNum(value: number | undefined, fmt: Intl.NumberFormat): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '–'
  return fmt.format(value)
}

function fmtDate(iso: string | undefined, language: string): string {
  if (!iso) return '–'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '–'
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(d)
}

/** Übersetzt eine Enum-Liste in eine kommagetrennte, lesbare Liste. */
function joinTranslated(
  values: readonly string[],
  t: TFunction,
  prefix: string,
  empty: string,
): string {
  if (!values || values.length === 0) return empty
  return values.map((v) => t(`${prefix}.${v}`)).join(', ')
}

// --- Kopf & Fuß ---

function drawHeader(c: Cursor, t: TFunction, language: string, data: ReportData): void {
  const doc = c.doc
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 15, 15)
  doc.text(toLatin1(t('report.pdf.title')), MARGIN_X, c.y)
  c.y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110, 110, 110)
  const dateLine = t('report.pdf.dateLine', { date: fmtDate(data.generatedAt, language) })
  doc.text(toLatin1(dateLine), MARGIN_X, c.y)

  const name = data.profileShort.profileName?.trim()
  if (name) {
    doc.text(toLatin1(name), PAGE_W - MARGIN_X, c.y, { align: 'right' })
  }
  c.y += 4
  doc.setDrawColor(180, 180, 180)
  doc.line(MARGIN_X, c.y, PAGE_W - MARGIN_X, c.y)
  c.y += LINE_H
}

/** Schreibt Seitenzahlen und Fußnote auf alle Seiten. */
function drawFooters(doc: jsPDF, t: TFunction): void {
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    const pageLabel = t('report.pdf.page', { n: p, total })
    doc.text(toLatin1(pageLabel), PAGE_W - MARGIN_X, PAGE_H - 10, { align: 'right' })
    doc.text(toLatin1(t('report.pdf.footnote')), MARGIN_X, PAGE_H - 10)
  }
}

// --- Abschnitte ---

function writeProfileSection(
  c: Cursor,
  variant: ReportVariant,
  t: TFunction,
  language: string,
  data: ReportData,
): void {
  writeSectionTitle(c, t('report.pdf.section.profile'))
  writeProfileShort(c, t, language, data.profileShort)
  if (variant === 'long') writeProfileLong(c, t, data.profileLong)
}

function writeProfileShort(
  c: Cursor,
  t: TFunction,
  language: string,
  p: ReportProfileShort,
): void {
  const fmt = makeNumberFmt(language)
  const L = (k: string) => t(`onboarding.step8.labels.${k}`)
  if (p.profileName?.trim()) writeField(c, L('profileName'), p.profileName.trim())
  if (p.buildingType) writeField(c, L('buildingType'), t(`onboarding.step2.${p.buildingType}`))
  writeField(c, L('livingArea'), `${fmtNum(p.livingArea, fmt)} m²`)
  writeField(c, L('buildingYear'), fmtNum(p.buildingYear, fmt))
  writeField(c, L('persons'), fmtNum(p.personsCount, fmt))
  writeField(
    c,
    L('heatGenerators'),
    joinTranslated(p.heatGenerators, t, 'onboarding.step4.generators', t('report.pdf.empty.none')),
  )
  if (p.hotWaterType) {
    writeField(c, L('hotWater'), t(`onboarding.step4.hotWaterOptions.${p.hotWaterType}`))
  }
}

function writeProfileLong(c: Cursor, t: TFunction, p: ReportProfileLong): void {
  const L = (k: string) => t(`onboarding.step8.labels.${k}`)
  if (Number.isFinite(p.floors)) writeField(c, L('floors'), String(p.floors))
  if (p.windowAge) writeField(c, L('windowAge'), t(`onboarding.step2.windowAgeOptions.${p.windowAge}`))
  if (p.insulationState) {
    writeField(c, L('insulationState'), t(`onboarding.step5.insulationOptions.${p.insulationState}`))
  }
  if (p.ventilationType) {
    writeField(c, L('ventilationType'), t(`onboarding.step5.ventilationOptions.${p.ventilationType}`))
  }
  if (p.hasPV) writeField(c, L('hasPV'), t(`onboarding.step4.pvOptions.${p.hasPV}`))
  if (p.occupancyStatus) {
    writeField(c, L('occupancyStatus'), t(`onboarding.step1.occupancyOptions.${p.occupancyStatus}`))
  }
  if (p.lastRenovationYear) {
    writeField(
      c,
      L('lastRenovationYear'),
      t(`onboarding.step7renovation.renovationYearOptions.${p.lastRenovationYear}`),
    )
  }
  if (p.renovationItems.length > 0) {
    writeField(
      c,
      L('renovationItems'),
      joinTranslated(
        p.renovationItems,
        t,
        'onboarding.step7renovation.renovationItemOptions',
        t('report.pdf.empty.none'),
      ),
    )
  }
  if (p.goals.length > 0) {
    writeField(
      c,
      L('goals'),
      joinTranslated(p.goals, t, 'onboarding.step1.goalOptions', t('report.pdf.empty.none')),
    )
  }
}

function writeMeasurementsSection(
  c: Cursor,
  variant: ReportVariant,
  t: TFunction,
  language: string,
  measurements: ReportMeasurement[],
): void {
  writeSectionTitle(c, t('report.pdf.section.measurements'))
  if (measurements.length === 0) {
    writeText(c, t('report.pdf.empty.measurements'), { color: [120, 120, 120] })
    return
  }
  const fmt = makeNumberFmt(language, 1)
  for (const m of measurements) {
    writeMeasurement(c, variant, t, fmt, m)
  }
}

function writeMeasurement(
  c: Cursor,
  variant: ReportVariant,
  t: TFunction,
  fmt: Intl.NumberFormat,
  m: ReportMeasurement,
): void {
  ensureSpace(c, LINE_H * 2)
  const title = t(`measurements.${m.id}.title`)
  const rating = t(`measurements.ratings.${m.rating}`)
  writeText(c, `${title}: ${fmtNum(m.primaryValue, fmt)} ${m.unit} (${rating})`, { bold: true })
  if (variant === 'long') {
    const summary = t(`measurements.${m.id}.result.summary.${m.rating}`, { defaultValue: '' })
    if (summary) writeText(c, summary, { color: [110, 110, 110], indent: 4 })
  }
}

function writeMonitoringSection(
  c: Cursor,
  variant: ReportVariant,
  t: TFunction,
  language: string,
  monitoring: ReportMonitoringEntry[],
): void {
  writeSectionTitle(c, t('report.pdf.section.monitoring'))
  if (monitoring.length === 0) {
    writeText(c, t('report.pdf.empty.monitoring'), { color: [120, 120, 120] })
    return
  }
  const numFmt = makeNumberFmt(language, 1)
  const curFmt = new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' })
  for (const e of monitoring) {
    writeMonitoringEntry(c, variant, t, language, numFmt, curFmt, e)
  }
}

function writeMonitoringEntry(
  c: Cursor,
  variant: ReportVariant,
  t: TFunction,
  language: string,
  numFmt: Intl.NumberFormat,
  curFmt: Intl.NumberFormat,
  e: ReportMonitoringEntry,
): void {
  ensureSpace(c, LINE_H * 2)
  const name = t(`monitoring.energyTypes.${e.type}`)
  if (e.latestValue === undefined) {
    writeText(c, `${name}: ${t('report.pdf.empty.noReading')}`, { bold: true })
    return
  }
  const head = `${name}: ${fmtNum(e.latestValue, numFmt)} ${e.unit} (${fmtDate(e.latestDate, language)})`
  writeText(c, head, { bold: true })

  if (variant === 'long') {
    if (e.lastConsumption !== undefined) {
      writeField(
        c,
        t('monitoring.readings.stats.lastConsumption'),
        `${fmtNum(e.lastConsumption, numFmt)} ${e.unit}`,
      )
    }
    if (e.projectedYear !== undefined) {
      writeField(
        c,
        t('monitoring.readings.stats.projectedYear'),
        `${fmtNum(e.projectedYear, numFmt)} ${e.unit}`,
      )
    }
    if (e.projectedYearCost !== undefined) {
      writeField(c, t('monitoring.readings.stats.costPerYear'), curFmt.format(e.projectedYearCost))
    }
  }
}

/** Erzeugt einen Dateinamen mit aktuellem Datum (ISO yyyy-mm-dd). */
function buildFileName(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `E-App-Bericht-${today}.pdf`
}

/**
 * Erzeugt das PDF und startet den Download.
 */
export function generateReportPdf({ variant, t, language, data }: GenerateReportArgs): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const c: Cursor = { doc, y: MARGIN_TOP }

  drawHeader(c, t, language, data)
  writeProfileSection(c, variant, t, language, data)
  writeMeasurementsSection(c, variant, t, language, data.measurements)
  writeMonitoringSection(c, variant, t, language, data.monitoring)
  drawFooters(doc, t)

  doc.save(buildFileName())
}
