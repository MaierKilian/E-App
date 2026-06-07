import type { TFunction } from 'i18next'

/**
 * Erzeugt ein PDF-„Vorbereitungstest"-Zertifikat für einen Laborversuch und
 * startet den Download. jsPDF wird dynamisch importiert, damit es nicht im
 * Haupt-Bundle landet (Muster: src/features/reports/generatePdf.ts).
 *
 * Hinweis Schrift: der jsPDF-Standardfont (Helvetica) ist Latin-1. Unicode-
 * Tiefstellungen (₀–₉) werden über toLatin1() zu normalen Ziffern normalisiert.
 */

export interface GenerateCertificateArgs {
  experimentId: string
  experimentTitle: string
  name?: string
  score: number
  total: number
  passed: boolean
  t: TFunction
  language: string
}

const MARGIN_X = 20
const PAGE_W = 210

/** Ersetzt Unicode-Tiefstellungen ₀–₉ durch normale Ziffern (Latin-1-fest). */
function toLatin1(input: string): string {
  const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
  return input.replace(/[₀-₉]/g, (ch) => String(SUBSCRIPTS.indexOf(ch)))
}

function fmtDate(language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date())
}

/** Erzeugt einen Dateinamen mit Versuchs-ID und aktuellem Datum (ISO yyyy-mm-dd). */
function buildFileName(experimentId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `E-App-Vorbereitungstest-${experimentId}-${today}.pdf`
}

export async function generateCertificate({
  experimentId,
  experimentTitle,
  name,
  score,
  total,
  passed,
  t,
  language,
}: GenerateCertificateArgs): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = 40

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(15, 15, 15)
  doc.text(toLatin1(t('education.quiz.certificateTitle')), MARGIN_X, y)
  y += 6

  doc.setDrawColor(180, 180, 180)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += 16

  const writeRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(120, 120, 120)
    doc.text(toLatin1(label), MARGIN_X, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text(toLatin1(value), MARGIN_X + 50, y)
    y += 10
  }

  writeRow(t('education.quiz.certificateExperiment'), experimentTitle)
  if (name?.trim()) writeRow(t('education.quiz.certificateName'), name.trim())
  writeRow(t('education.quiz.certificateDate'), fmtDate(language))
  writeRow(t('education.quiz.certificateScore'), `${score} / ${total}`)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  if (passed) doc.setTextColor(34, 139, 34)
  else doc.setTextColor(176, 58, 46)
  const resultLabel = passed ? t('education.quiz.passed') : t('education.quiz.failed')
  doc.text(toLatin1(resultLabel), MARGIN_X, y)

  doc.save(buildFileName(experimentId))
}
