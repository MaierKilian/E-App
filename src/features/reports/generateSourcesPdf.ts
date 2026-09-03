import type { TFunction } from 'i18next'
import type { PdfKit } from './pdf/pdfKit'
import { buildSourceList } from './thresholdReference'

/**
 * Das Quellenverzeichnis am Ende des Berichts.
 *
 * Die Nummern hinter den Richtwerten der Mess-Übersicht lösen sich hier auf.
 * Bewusst am Ende und nicht als Fußnote je Zeile: Die Tabelle hat dafür keine
 * Breite, und eine Quelle, die dreimal vorkommt, stünde dreimal da.
 *
 * **Auch das Unbelegte steht hier.** Wo keine Fremdquelle gefunden wurde, sagt
 * das Verzeichnis das ausdrücklich – als Richtwert dieser App mit Begründung,
 * oder als offener Punkt. Ein Verzeichnis, das nur die belegten Werte auflistet,
 * ließe den Rest wie belegt aussehen.
 */
export function fillSources(kit: PdfKit, t: TFunction, measurementIds: readonly string[]): void {
  const sources = buildSourceList(measurementIds)
  if (sources.length === 0) return

  kit.subHead(t('report.pdf.sources.title'), { keepWith: 60 })
  kit.subtle(t('report.pdf.sources.intro'))
  kit.gap(8)

  for (const entry of sources) {
    const messungen = entry.measurementIds
      .map((id) => t(`measurements.${id}.title`))
      .join(', ')

    if (entry.url) {
      kit.subtle(
        `[${entry.index}] ${entry.label}${entry.stand ? ` (Stand ${entry.stand})` : ''} — ${messungen}`,
      )
      kit.subtle(entry.url, { indent: 10 })
    } else {
      const marke = t(
        entry.pending ? 'report.pdf.sources.pending' : 'report.pdf.sources.ownValue',
      )
      kit.subtle(`[${entry.index}] ${marke} — ${messungen}`)
      if (entry.reason) kit.subtle(entry.reason, { indent: 10 })
    }
    kit.gap(4)
  }

  kit.gap(6)
  kit.subtle(t('report.pdf.sources.disclaimer'))
}
