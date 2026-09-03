import type { TFunction } from 'i18next'
import type { PdfKit } from './pdf/pdfKit'
import { buildProfileReportData, fmtRow } from './profileReportData'
import type { OnboardingData } from '@/types'

/**
 * Der Steckbrief-Abschnitt des Energieberichts. Wird von
 * {@link generateReportPdf} in ein bestehendes Dokument geschrieben.
 *
 * Vier Blöcke aus beschrifteten Wertepaaren – Gebäude, Haushalt,
 * Anlagentechnik, Sanierungen. Bewusst eine Aufzählung und keine Auswertung:
 * Die Einordnung leisten die Kapitel danach, dieses hier sagt nur, worum es
 * geht.
 */

export interface GenerateProfileArgs {
  t: TFunction
  language: string
  data: OnboardingData
}

export function fillProfile(kit: PdfKit, { t, language, data }: GenerateProfileArgs): void {
  kit.subtle(t('report.pdf.profile.intro'))
  kit.gap(10)

  for (const block of buildProfileReportData(data, t, language)) {
    // `keepWith` hält Überschrift und erste Zeilen zusammen – eine
    // Blocküberschrift allein am Seitenfuß ist schlimmer als ein früherer
    // Umbruch.
    kit.subHead(block.title, { keepWith: 60 })
    kit.kvTable(block.rows.map(([label, value]) => [label, fmtRow(t, value)]))
    kit.gap(12)
  }
}
